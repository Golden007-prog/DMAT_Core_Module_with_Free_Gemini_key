import { createSessionStore } from '../../state/sessionStore';
import { createTimer } from '../../state/timer';
import { MemoryStorage } from '../../storage/db';
import { fakeClock } from '../helpers/fakeClock';
import { retryExactSet, retryMistakes } from '../../state/retry';
import { createFullCoreStore } from '../../state/fullCoreStore';
import type { EquationQuestion, LatinQuestion, Session } from '../../engine/types';

function makeStore() {
  const { clock, advance } = fakeClock();
  const store = createSessionStore({
    timer: createTimer(clock),
    storage: async () => new MemoryStorage(),
    now: () => clock.wallNow(),
    newSeed: (() => {
      let n = 500;
      return () => n++;
    })(),
  });
  return { store, advance };
}

async function finishedSession(store: ReturnType<typeof makeStore>['store']): Promise<Session> {
  await store.getState().startNewSession({
    mode: 'practice',
    subtest: 'latin',
    difficulty: 'easy',
    questionCount: 4,
    seed: 0,
  });
  store.getState().start();
  const s = store.getState().session!;
  // answer q0 correctly, q1 wrong, leave the rest blank
  const q0 = s.questions[0] as LatinQuestion;
  const q1 = s.questions[1] as LatinQuestion;
  store.getState().answer(q0.id, q0.solutionLetter);
  const wrong = (['A', 'B', 'C', 'D', 'E'] as const).find((l) => l !== q1.solutionLetter)!;
  store.getState().answer(q1.id, wrong);
  await store.getState().submit();
  return store.getState().session!;
}

describe('retryExactSet', () => {
  it('reproduces the identical question content with fresh ids and empty answers', async () => {
    const { store } = makeStore();
    const original = await finishedSession(store);

    await retryExactSet(store, original);
    const retried = store.getState().session!;
    expect(retried.state).toBe('ready');
    expect(retried.id).not.toBe(original.id);
    expect(retried.seed).toBe(original.seed);
    expect(Object.keys(retried.answers)).toHaveLength(0);
    // same content (latin grids identical), different UUIDs (R5)
    for (let i = 0; i < original.questions.length; i++) {
      const a = original.questions[i] as LatinQuestion;
      const b = retried.questions[i] as LatinQuestion;
      expect(b.grid).toEqual(a.grid);
      expect(b.solutionLetter).toBe(a.solutionLetter);
      expect(b.id).not.toBe(a.id);
    }
  });
});

describe('retryMistakes', () => {
  it('builds a session containing exactly the wrong/unanswered questions', async () => {
    const { store } = makeStore();
    const original = await finishedSession(store);

    await retryMistakes(store, original);
    const retried = store.getState().session!;
    expect(retried.state).toBe('ready');
    expect(retried.questionCount).toBe(3); // q1 wrong + 2 unanswered
    expect(retried.durationMs).toBe(3 * 75_000);
    const originalGrids = original.questions.map((q) => JSON.stringify((q as LatinQuestion).grid));
    for (const q of retried.questions) {
      expect(originalGrids).toContain(JSON.stringify((q as LatinQuestion).grid));
      // fresh UUIDs so answers can never collide with the old session (R5)
      expect(original.questions.map((o) => o.id)).not.toContain(q.id);
    }
    // the correctly answered question is NOT in the retry set
    const correctGrid = JSON.stringify((original.questions[0] as LatinQuestion).grid);
    expect(retried.questions.map((q) => JSON.stringify((q as LatinQuestion).grid))).not.toContain(
      correctGrid,
    );
  });

  it('is a no-op when every question was answered correctly', async () => {
    const { store } = makeStore();
    await store.getState().startNewSession({
      mode: 'practice',
      subtest: 'latin',
      difficulty: 'easy',
      questionCount: 2,
      seed: 0,
    });
    store.getState().start();
    const s = store.getState().session!;
    for (const q of s.questions) {
      store.getState().answer(q.id, (q as LatinQuestion).solutionLetter);
    }
    await store.getState().submit();
    const finished = store.getState().session!;
    const result = await retryMistakes(store, finished);
    expect(result).toBe(false);
  });
});

describe('full core module run', () => {
  it('walks figures → equations → latin with breaks between stages', async () => {
    const core = createFullCoreStore();
    expect(core.getState().active).toBe(false);
    core.getState().begin();
    expect(core.getState().active).toBe(true);
    expect(core.getState().currentSubtest()).toBe('figures');

    core.getState().stageFinished('session-1');
    expect(core.getState().atBreak).toBe(true);
    core.getState().nextStage();
    expect(core.getState().currentSubtest()).toBe('equations');

    core.getState().stageFinished('session-2');
    core.getState().nextStage();
    expect(core.getState().currentSubtest()).toBe('latin');

    core.getState().stageFinished('session-3');
    expect(core.getState().complete).toBe(true);
    expect(core.getState().sessionIds).toEqual(['session-1', 'session-2', 'session-3']);
    core.getState().reset();
    expect(core.getState().active).toBe(false);
  });

  it('exam config for a stage is 20 questions / 25 minutes / exam mode', () => {
    const core = createFullCoreStore();
    core.getState().begin();
    const cfg = core.getState().stageConfig();
    expect(cfg.questionCount).toBe(20);
    expect(cfg.durationMs).toBe(25 * 60_000);
    expect(cfg.mode).toBe('exam');
    expect(cfg.subtest).toBe('figures');
  });
});

describe('equation retry preserves ask mode content', () => {
  it('retryExactSet on equations reproduces displays', async () => {
    const { store } = makeStore();
    await store.getState().startNewSession({
      mode: 'practice',
      subtest: 'equations',
      difficulty: 'medium',
      questionCount: 3,
      seed: 0,
    });
    store.getState().start();
    await store.getState().submit();
    const original = store.getState().session!;
    await retryExactSet(store, original);
    const retried = store.getState().session!;
    expect(
      retried.questions.map((q) => (q as EquationQuestion).equationsDisplay),
    ).toEqual(original.questions.map((q) => (q as EquationQuestion).equationsDisplay));
  });
});
