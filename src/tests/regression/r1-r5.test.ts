/**
 * Regression suite for the named bug classes R1–R5 (spec §2/§12).
 * Drives the real session store with a fake clock, manual generation
 * yielding, and in-memory storage.
 */
import { createSessionStore, type SessionStore } from '../../state/sessionStore';
import { createTimer } from '../../state/timer';
import { MemoryStorage } from '../../storage/db';
import { generateQuestionAt } from '../../engine/generateSet';
import { fakeClock } from '../helpers/fakeClock';
import type { SessionConfig } from '../../state/sessionMachine';
import type { StoreApi } from 'zustand';

function manualYield() {
  const queue: Array<() => void> = [];
  const fn = () =>
    new Promise<void>((resolve) => {
      queue.push(resolve);
    });
  const release = async (n: number) => {
    for (let i = 0; i < n; i++) {
      // wait briefly until the store actually requests the next yield;
      // surplus releases fall through cheaply
      for (let spins = 0; queue.length === 0 && spins < 25; spins++) {
        await new Promise((r) => setTimeout(r, 0));
      }
      queue.shift()?.();
    }
    await new Promise((r) => setTimeout(r, 0));
  };
  return { fn, release };
}

interface Harness {
  store: StoreApi<SessionStore>;
  advance: (ms: number) => void;
  setWall: (ts: number) => void;
  release: (n: number) => Promise<void>;
  storage: MemoryStorage;
  generatedIds: string[];
  seeds: number[];
}

function makeHarness(opts: {
  storage?: MemoryStorage;
  seeds?: number[];
  wall?: number;
  yieldAdvanceMs?: number;
} = {}): Harness {
  const { clock, advance, setWall } = fakeClock(opts.wall);
  const storage = opts.storage ?? new MemoryStorage();
  const my = manualYield();
  const generatedIds: string[] = [];
  const seeds = opts.seeds ?? [101, 202, 303];
  let seedIdx = 0;

  const store = createSessionStore({
    timer: createTimer(clock),
    storage: async () => storage,
    now: () => clock.wallNow(),
    newSeed: () => seeds[seedIdx++ % seeds.length],
    yieldBetween: async () => {
      if (opts.yieldAdvanceMs) advance(opts.yieldAdvanceMs);
      await my.fn();
    },
    generateQuestionAt: (cfg, i) => {
      const q = generateQuestionAt(cfg, i);
      generatedIds.push(q.id);
      return q;
    },
  });

  return { store, advance, setWall, release: my.release, storage, generatedIds, seeds };
}

const CFG: SessionConfig = {
  mode: 'exam',
  subtest: 'latin',
  difficulty: 'easy',
  questionCount: 5,
  seed: 0, // store replaces with newSeed()
};

async function generateFully(h: Harness, cfg = CFG) {
  const p = h.store.getState().startNewSession(cfg);
  await h.release(cfg.questionCount + 1);
  await p;
}

describe('R1 — restart = brand-new set, atomically', () => {
  it('restart during GENERATING discards the old sessions questions entirely', async () => {
    const h = makeHarness();
    const first = h.store.getState().startNewSession(CFG);
    await h.release(2); // two questions of session A generated
    const idsA = [...h.generatedIds];
    expect(idsA.length).toBeGreaterThanOrEqual(1);

    const second = h.store.getState().startNewSession(CFG); // restart mid-generation
    await h.release(10);
    await first;
    await second;

    const s = h.store.getState().session!;
    expect(s.state).toBe('ready');
    expect(s.questions).toHaveLength(5); // exactly N — never N+k, never a mix
    for (const q of s.questions) {
      expect(idsA).not.toContain(q.id); // zero questions reused from the dead session
    }
    expect(s.seed).toBe(h.seeds[1]); // new RNG seed
  });

  it('restart during RUNNING produces a fresh session with empty answers', async () => {
    const h = makeHarness();
    await generateFully(h);
    h.store.getState().start();
    const a = h.store.getState().session!;
    h.store.getState().answer(a.questions[0].id, a.questions[0].type === 'latin' ? 'A' : 0);
    expect(Object.keys(h.store.getState().session!.answers)).toHaveLength(1);

    const restart = h.store.getState().restart();
    await h.release(6);
    await restart;

    const b = h.store.getState().session!;
    expect(b.id).not.toBe(a.id);
    expect(b.state).toBe('ready');
    expect(Object.keys(b.answers)).toHaveLength(0);
    const aIds = new Set(a.questions.map((q) => q.id));
    for (const q of b.questions) expect(aIds.has(q.id)).toBe(false);
  });

  it('responses arriving for a dead sessionId are discarded', async () => {
    const h = makeHarness();
    const first = h.store.getState().startNewSession(CFG);
    await h.release(1);
    const second = h.store.getState().startNewSession(CFG);
    // now release everything — session A's pending generation resumes and must self-discard
    await h.release(12);
    await first;
    await second;
    const s = h.store.getState().session!;
    expect(s.questions).toHaveLength(5);
    expect(s.seed).toBe(h.seeds[1]);
  });
});

describe('R2 — timer never runs during generation or loading', () => {
  it('a slow 5 s generation costs the user zero seconds', async () => {
    // each yield advances the fake clock by 1 s → 5+ s of "generation time"
    const h = makeHarness({ yieldAdvanceMs: 1000 });
    await generateFully(h);
    const st = h.store.getState();
    expect(st.session!.state).toBe('ready');
    expect(st.remainingMs).toBe(st.session!.durationMs); // full duration at READY
  });

  it('the countdown only moves after START', async () => {
    const h = makeHarness();
    await generateFully(h);
    h.advance(10_000); // idle on the READY screen
    expect(h.store.getState().remainingMs).toBe(h.store.getState().session!.durationMs);
    h.store.getState().start();
    h.advance(1000);
    expect(h.store.getState().remainingMs).toBe(
      h.store.getState().session!.durationMs - 1000,
    );
  });
});

describe('R3 — full set generated up front', () => {
  it('the session is never READY/RUNNING with fewer than N questions', async () => {
    const h = makeHarness();
    const p = h.store.getState().startNewSession(CFG);
    await h.release(2);
    const mid = h.store.getState().session!;
    expect(mid.state).toBe('generating'); // still generating, not startable
    expect(() => h.store.getState().start()).toThrow(); // cannot start mid-generation
    await h.release(4);
    await p;
    expect(h.store.getState().session!.state).toBe('ready');
    expect(h.store.getState().session!.questions).toHaveLength(5);
  });
});

describe('R4 — timer integrity across refresh and expiry', () => {
  it('refresh at T-10:00 restores remaining within ±1 s', async () => {
    const storage = new MemoryStorage();
    const h1 = makeHarness({ storage });
    await generateFully(h1);
    h1.store.getState().start();
    const sess = h1.store.getState().session!;
    h1.store.getState().answer(sess.questions[0].id, 'A'); // persists snapshot
    await new Promise((r) => setTimeout(r, 0));

    // simulate a refresh 10 minutes before the deadline
    const h2 = makeHarness({ storage, wall: sess.endsAt! - 600_000 });
    const resumed = await h2.store.getState().resumeIfRunning();
    expect(resumed).toBe(true);
    const st = h2.store.getState();
    expect(st.session!.id).toBe(sess.id);
    expect(st.session!.state).toBe('running');
    expect(Math.abs(st.remainingMs - 600_000)).toBeLessThan(1000);
    expect(st.session!.answers[sess.questions[0].id]).toBe('A'); // answers survive
  });

  it('if the deadline passed while away, the session lands on FINISHED (auto-submitted)', async () => {
    const storage = new MemoryStorage();
    const h1 = makeHarness({ storage });
    await generateFully(h1);
    h1.store.getState().start();
    const sess = h1.store.getState().session!;
    h1.store.getState().answer(sess.questions[0].id, 'A');
    await new Promise((r) => setTimeout(r, 0));

    const h2 = makeHarness({ storage, wall: sess.endsAt! + 5000 });
    const resumed = await h2.store.getState().resumeIfRunning();
    expect(resumed).toBe(true);
    expect(h2.store.getState().session!.state).toBe('finished');
  });

  it('rapid expiry ticks produce exactly one FINISHED transition and one attempts write', async () => {
    const h = makeHarness();
    await generateFully(h);
    h.store.getState().start();
    h.advance(CFG.questionCount * 75_000 + 5000); // sail past the deadline
    h.advance(1000);
    h.advance(1000);
    await new Promise((r) => setTimeout(r, 0));
    expect(h.store.getState().session!.state).toBe('finished');
    const attempts = await h.storage.allAttempts();
    expect(attempts).toHaveLength(5); // written once, not once per tick
  });
});

describe('R5 — answer state isolation across regeneration', () => {
  it('answering new-Q3 after a restart cannot contaminate old-Q3', async () => {
    const h = makeHarness();
    await generateFully(h);
    h.store.getState().start();
    const a = h.store.getState().session!;
    const oldQ3 = a.questions[2];
    h.store.getState().answer(oldQ3.id, 'D');

    const restart = h.store.getState().restart();
    await h.release(6);
    await restart;
    h.store.getState().start();

    const b = h.store.getState().session!;
    const newQ3 = b.questions[2];
    expect(newQ3.id).not.toBe(oldQ3.id);
    h.store.getState().answer(newQ3.id, 'E');

    expect(b.id).not.toBe(a.id);
    expect(h.store.getState().session!.answers[newQ3.id]).toBe('E');
    expect(h.store.getState().session!.answers[oldQ3.id]).toBeUndefined();
  });
});
