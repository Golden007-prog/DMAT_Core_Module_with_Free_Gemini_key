import type { Question, Session, SessionMode, SubtestType, Difficulty } from '../engine/types';
import { computeScore } from './scoring';

export interface SessionConfig {
  mode: SessionMode;
  subtest: SubtestType;
  difficulty: Difficulty | 'mixed';
  questionCount: number;
  seed: number;
  durationMs?: number;
}

/** Official pacing: 75 s per task (20 tasks in 25:00). */
export const MS_PER_TASK = 75_000;

export type SessionEvent =
  | { type: 'GENERATE' }
  | { type: 'GENERATED'; questions: Question[] }
  | { type: 'CANCEL_GENERATION' }
  | { type: 'START'; startedAt: number; endsAt: number }
  | { type: 'ANSWER'; questionId: string; value: unknown; timeMs: number }
  | { type: 'FLAG'; questionId: string }
  | { type: 'SUBMIT'; finishedAt: number }
  | { type: 'TIME_UP'; finishedAt: number }
  | { type: 'REVIEW' };

export function createSession(config: SessionConfig): Session {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    mode: config.mode,
    subtest: config.subtest,
    difficulty: config.difficulty,
    questionCount: config.questionCount,
    durationMs: config.durationMs ?? config.questionCount * MS_PER_TASK,
    seed: config.seed,
    questions: [],
    answers: {},
    answerTimesMs: {},
    flagged: [],
    state: 'setup',
    generatorSource: 'deterministic',
  };
}

function illegal(session: Session, event: SessionEvent): never | Session {
  if (import.meta.env.DEV) {
    throw new Error(`illegal transition: ${event.type} while ${session.state}`);
  }
  return session; // prod: no-op — never corrupt a live session
}

/** The ONLY way session state mutates. Pure: returns a new session object. */
export function transition(session: Session, event: SessionEvent): Session {
  switch (event.type) {
    case 'GENERATE':
      if (session.state !== 'setup') return illegal(session, event);
      return { ...session, state: 'generating' };

    case 'GENERATED': {
      if (session.state !== 'generating') return illegal(session, event);
      if (event.questions.length !== session.questionCount) {
        // R3 hard guard: a runner must never see a short set
        throw new Error(
          `question count mismatch: expected ${session.questionCount}, got ${event.questions.length}`,
        );
      }
      return { ...session, questions: event.questions, state: 'ready' };
    }

    case 'CANCEL_GENERATION':
      if (session.state !== 'generating') return illegal(session, event);
      return { ...session, questions: [], state: 'setup' };

    case 'START':
      if (session.state !== 'ready') return illegal(session, event);
      return { ...session, state: 'running', startedAt: event.startedAt, endsAt: event.endsAt };

    case 'ANSWER': {
      if (session.state !== 'running') return illegal(session, event);
      if (!session.questions.some((q) => q.id === event.questionId)) {
        throw new Error(`unknown question id ${event.questionId}`);
      }
      return {
        ...session,
        answers: { ...session.answers, [event.questionId]: event.value },
        answerTimesMs: {
          ...session.answerTimesMs,
          [event.questionId]: (session.answerTimesMs[event.questionId] ?? 0) + event.timeMs,
        },
      };
    }

    case 'FLAG': {
      if (session.state !== 'running') return illegal(session, event);
      const flagged = session.flagged.includes(event.questionId)
        ? session.flagged.filter((id) => id !== event.questionId)
        : [...session.flagged, event.questionId];
      return { ...session, flagged };
    }

    case 'SUBMIT':
    case 'TIME_UP': {
      if (session.state === 'finished' || session.state === 'reviewed') {
        return session; // idempotent: time-up auto-submits exactly once (R4)
      }
      if (session.state !== 'running') return illegal(session, event);
      return {
        ...session,
        state: 'finished',
        finishedAt: event.finishedAt,
        score: computeScore(session, session.answerTimesMs),
      };
    }

    case 'REVIEW':
      if (session.state !== 'finished') return illegal(session, event);
      return { ...session, state: 'reviewed' };
  }
}
