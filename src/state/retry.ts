import type { StoreApi } from 'zustand';
import type { Question, Session } from '../engine/types';
import { isAnswerCorrect } from './scoring';
import type { SessionStore } from './sessionStore';

/** Deep-copies a question with a fresh UUID so answers can never collide
 *  with a previous session's keys (R5). */
function cloneWithFreshId(q: Question): Question {
  const copy = JSON.parse(JSON.stringify(q)) as Question;
  copy.id = crypto.randomUUID();
  return copy;
}

/** "Retry this exact set": same seed, same config → identical content,
 *  fresh answers. */
export async function retryExactSet(
  store: StoreApi<SessionStore>,
  session: Session,
): Promise<void> {
  await store.getState().startNewSession(
    {
      mode: session.mode,
      subtest: session.subtest as Exclude<Session['subtest'], 'full-core'>,
      difficulty: session.difficulty,
      questionCount: session.questionCount,
      seed: session.seed,
      durationMs: session.durationMs,
    },
    { keepSeed: true },
  );
}

/** "Retry my mistakes": a new practice session containing exactly the
 *  questions answered wrong or left blank. Returns false when there are none. */
export async function retryMistakes(
  store: StoreApi<SessionStore>,
  session: Session,
): Promise<boolean> {
  const wrong = session.questions.filter((q) => !isAnswerCorrect(q, session.answers[q.id]));
  if (wrong.length === 0) return false;
  await store.getState().startSessionFromQuestions(wrong.map(cloneWithFreshId), {
    mode: 'practice',
    subtest: session.subtest as Exclude<Session['subtest'], 'full-core'>,
    difficulty: session.difficulty,
  });
  return true;
}
