import { createStore, useStore, type StoreApi } from 'zustand';
import type { Question, Session } from '../engine/types';
import {
  generateQuestionAt as engineGenerateQuestionAt,
  type GenerateSetConfig,
} from '../engine/generateSet';
import { createSession, transition, type SessionConfig } from './sessionMachine';
import { isAnswerCorrect } from './scoring';
import { createTimer, realClock, type Timer } from './timer';
import { getStorage, type StorageAPI } from '../storage/db';

export interface SessionDeps {
  timer: Timer;
  storage: () => Promise<StorageAPI>;
  /** wall clock (persistence); the timer keeps its own monotonic clock */
  now: () => number;
  newSeed: () => number;
  /** yields between question generations: UI stays responsive, aborts land */
  yieldBetween: () => Promise<void>;
  generateQuestionAt: (cfg: GenerateSetConfig, index: number) => Question;
}

export interface SessionStore {
  session: Session | null;
  lastConfig: SessionConfig | null;
  progress: { done: number; total: number } | null;
  remainingMs: number;
  currentIndex: number;
  questionShownAt: number | null;
  readOnly: boolean;
  storagePersistent: boolean;

  startNewSession(cfg: SessionConfig, opts?: { keepSeed?: boolean }): Promise<void>;
  cancelGeneration(): void;
  start(): void;
  goTo(index: number): void;
  answer(questionId: string, value: unknown): void;
  flag(questionId: string): void;
  submit(): Promise<void>;
  restart(): Promise<void>;
  resumeIfRunning(): Promise<boolean>;
  freeze(): void;
  unfreeze(): void;
  markReviewed(): void;
  setReadOnly(v: boolean): void;
}

const defaultDeps: SessionDeps = {
  timer: createTimer(realClock),
  storage: getStorage,
  now: () => Date.now(),
  newSeed: () => Math.floor(Math.random() * 2 ** 31),
  yieldBetween: () => new Promise((r) => setTimeout(r, 0)),
  generateQuestionAt: engineGenerateQuestionAt,
};

export function createSessionStore(overrides: Partial<SessionDeps> = {}): StoreApi<SessionStore> {
  const deps: SessionDeps = { ...defaultDeps, ...overrides };
  let currentAbort: AbortController | null = null;

  const store = createStore<SessionStore>((set, get) => {
    function persist(session: Session) {
      void deps
        .storage()
        .then((s) => s.saveSession(session))
        .catch(() => {
          /* storage unavailable → in-memory mode banner already shown */
        });
    }

    async function writeAttempts(session: Session) {
      const storage = await deps.storage();
      const times = session.answerTimesMs;
      await storage.addAttempts(
        session.questions.map((q) => ({
          id: crypto.randomUUID(),
          sessionId: session.id,
          questionId: q.id,
          type: q.type,
          difficulty: q.difficulty,
          ruleTags: q.ruleTags,
          correct: isAnswerCorrect(q, session.answers[q.id]),
          timeMs: times[q.id] ?? 0,
          ts: deps.now(),
        })),
      );
    }

    async function finalize(kind: 'SUBMIT' | 'TIME_UP') {
      const s = get().session;
      if (!s || s.state !== 'running') return; // idempotent (R4)
      const next = transition(s, { type: kind, finishedAt: deps.now() });
      if (next === s || next.state !== 'finished') return;
      deps.timer.disarm();
      set({ session: next, remainingMs: 0 });
      const storage = await deps.storage();
      await storage.saveSession(JSON.parse(JSON.stringify(next)) as Session);
      await writeAttempts(next);
    }

    deps.timer.subscribe((ms) => set({ remainingMs: ms }));
    deps.timer.onExpire(() => {
      void finalize('TIME_UP');
    });

    return {
      session: null,
      lastConfig: null,
      progress: null,
      remainingMs: 0,
      currentIndex: 0,
      questionShownAt: null,
      readOnly: false,
      storagePersistent: true,

      async startNewSession(cfgIn, opts = {}) {
        // R1: abort any in-flight generation, destroy the old session,
        // new session object with a NEW RNG seed, full fresh set, atomically.
        currentAbort?.abort();
        const abort = new AbortController();
        currentAbort = abort;
        deps.timer.disarm(); // R2: disarmed through SETUP/GENERATING/READY

        const cfg: SessionConfig = {
          ...cfgIn,
          seed: opts.keepSeed ? cfgIn.seed : deps.newSeed(),
        };
        let session = createSession(cfg);
        const sid = session.id;
        session = transition(session, { type: 'GENERATE' });
        set({
          session,
          lastConfig: cfg,
          progress: { done: 0, total: cfg.questionCount },
          remainingMs: session.durationMs,
          currentIndex: 0,
          questionShownAt: null,
        });

        const genCfg: GenerateSetConfig = {
          subtest: cfg.subtest,
          difficulty: cfg.difficulty,
          count: cfg.questionCount,
          seed: cfg.seed,
        };
        const questions: Question[] = [];
        for (let i = 0; i < cfg.questionCount; i++) {
          await deps.yieldBetween();
          // every generation request is tagged with its sessionId — anything
          // arriving for a dead session is discarded (R1)
          if (abort.signal.aborted || get().session?.id !== sid) return;
          questions.push(deps.generateQuestionAt(genCfg, i));
          set({ progress: { done: i + 1, total: cfg.questionCount } });
        }
        if (abort.signal.aborted || get().session?.id !== sid) return;
        set({
          session: transition(get().session!, { type: 'GENERATED', questions }),
          progress: null,
        });
      },

      cancelGeneration() {
        currentAbort?.abort();
        const s = get().session;
        if (s?.state === 'generating') {
          set({ session: transition(s, { type: 'CANCEL_GENERATION' }), progress: null });
        }
      },

      start() {
        const s = get().session;
        if (!s) throw new Error('no session to start');
        const startedAt = deps.now();
        const next = transition(s, { type: 'START', startedAt, endsAt: startedAt + s.durationMs });
        if (next.state !== 'running') return; // prod no-op path
        set({ session: next, currentIndex: 0, questionShownAt: deps.now() });
        // R2: the countdown arms here and only here
        deps.timer.arm(s.durationMs);
        persist(next);
      },

      goTo(index) {
        const s = get().session;
        if (!s || s.state !== 'running') return;
        if (index < 0 || index >= s.questions.length) return;
        set({ currentIndex: index, questionShownAt: deps.now() });
      },

      answer(questionId, value) {
        const s = get().session;
        if (!s || s.state !== 'running') return;
        const shownAt = get().questionShownAt ?? deps.now();
        const timeMs = Math.max(0, deps.now() - shownAt);
        const next = transition(s, { type: 'ANSWER', questionId, value, timeMs });
        set({ session: next, questionShownAt: deps.now() });
        persist(next); // R4: snapshot on every answer → refresh-safe
      },

      flag(questionId) {
        const s = get().session;
        if (!s || s.state !== 'running') return;
        set({ session: transition(s, { type: 'FLAG', questionId }) });
      },

      async submit() {
        await finalize('SUBMIT');
      },

      async restart() {
        const cfg = get().lastConfig;
        if (!cfg) throw new Error('nothing to restart');
        await get().startNewSession(cfg); // startNewSession draws a new seed
      },

      async resumeIfRunning() {
        const storage = await deps.storage();
        set({ storagePersistent: storage.persistent });
        const running = await storage.findRunningSessions();
        if (running.length === 0) return false;
        const latest = [...running].sort((a, b) => b.createdAt - a.createdAt)[0];
        const now = deps.now();

        if ((latest.endsAt ?? 0) <= now) {
          // deadline passed while away → land on FINISHED, auto-submitted once
          const finished = transition(latest, { type: 'TIME_UP', finishedAt: latest.endsAt! });
          await storage.saveSession(JSON.parse(JSON.stringify(finished)) as Session);
          await writeAttempts(finished);
          set({ session: finished, remainingMs: 0 });
          return true;
        }

        const remaining = latest.endsAt! - now;
        set({
          session: latest,
          remainingMs: remaining,
          currentIndex: 0,
          questionShownAt: now,
          lastConfig: {
            mode: latest.mode,
            subtest: latest.subtest as SessionConfig['subtest'],
            difficulty: latest.difficulty,
            questionCount: latest.questionCount,
            seed: latest.seed,
            durationMs: latest.durationMs,
          },
        });
        deps.timer.arm(remaining);
        return true;
      },

      freeze() {
        const s = get().session;
        if (s?.mode === 'practice' && s.state === 'running') deps.timer.freeze();
      },
      unfreeze() {
        deps.timer.resume();
      },

      markReviewed() {
        const s = get().session;
        if (s?.state === 'finished') {
          const next = transition(s, { type: 'REVIEW' });
          set({ session: next });
          persist(next);
        }
      },

      setReadOnly(v) {
        set({ readOnly: v });
      },
    };
  });

  return store;
}

/** App-wide singleton store + React hook. */
export const sessionStore = createSessionStore();

export function useSession<T>(selector: (s: SessionStore) => T): T {
  return useStore(sessionStore, selector);
}
