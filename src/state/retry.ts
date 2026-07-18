import type { StoreApi } from 'zustand';
import type { Question, Session } from '../engine/types';
import { isAnswerCorrect } from './scoring';
import type { SessionStore } from './sessionStore';

/** Deep-copies a question with a fresh UUID so answers can never collide
 *  with a previous session's keys (R5). GAM ids keep their passage prefix —
 *  the validator requires it and the runner groups by it. */
function cloneWithFreshId(q: Question): Question {
  const copy = JSON.parse(JSON.stringify(q)) as Question;
  copy.id =
    q.type === 'gam' ? `${q.passageId}-r${crypto.randomUUID().slice(0, 8)}` : crypto.randomUUID();
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
      subtest: session.subtest as Exclude<Session['subtest'], 'full-core' | 'full-dmat'>,
      difficulty: session.difficulty,
      questionCount: session.questionCount,
      seed: session.seed,
      durationMs: session.durationMs,
      latinAlphabet: session.latinAlphabet as 'letters' | 'digits' | 'greek' | 'shapes' | 'random' | undefined,
      gamTopicAreas: session.gamTopicAreas,
      gamPassageCount: session.gamPassages?.length,
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
  // gam retries carry the passage docs the wrong questions came from —
  // the runner needs the reading input, not just the question block
  const gamPassages = session.gamPassages?.filter((p) =>
    wrong.some((q) => q.type === 'gam' && q.passageId === p.id),
  );
  await store.getState().startSessionFromQuestions(
    wrong.map(cloneWithFreshId),
    {
      mode: 'practice',
      subtest: session.subtest as Exclude<Session['subtest'], 'full-core' | 'full-dmat'>,
      difficulty: session.difficulty,
    },
    gamPassages && gamPassages.length > 0 ? { gamPassages } : undefined,
  );
  return true;
}
