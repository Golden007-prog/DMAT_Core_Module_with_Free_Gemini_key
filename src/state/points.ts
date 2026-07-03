import type { Difficulty, Session } from '../engine/types';
import { isAnswerCorrect } from './scoring';

/** Ranking points (§weekly leagues): harder questions are worth more, mixed
 *  sets carry a breadth multiplier, and finishing under the time budget adds
 *  a bonus proportional to time saved (capped at +50% of earned points).
 *  Wrong or blank answers earn nothing, so speed alone cannot farm points. */
export const POINTS_PER_CORRECT: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 35,
};

export const MIXED_SET_MULTIPLIER = 1.15;
export const TIME_BONUS_CAP = 0.5;

export interface SessionPoints {
  base: number;
  timeBonus: number;
  total: number;
  /** e.g. "4×medium correct" — for the Results breakdown line */
  detail: string;
}

export function computeSessionPoints(session: Session): SessionPoints {
  if (!session.score || session.questions.length === 0) {
    return { base: 0, timeBonus: 0, total: 0, detail: '' };
  }

  const correctByDifficulty: Partial<Record<Difficulty, number>> = {};
  let answered = 0;
  let raw = 0;
  for (const q of session.questions) {
    const answer = session.answers[q.id];
    if (answer !== undefined) answered++;
    if (isAnswerCorrect(q, answer)) {
      raw += POINTS_PER_CORRECT[q.difficulty];
      correctByDifficulty[q.difficulty] = (correctByDifficulty[q.difficulty] ?? 0) + 1;
    }
  }

  const base = Math.round(raw * (session.difficulty === 'mixed' ? MIXED_SET_MULTIPLIER : 1));

  // time bonus: only when the whole set was answered (no blank-racing) and
  // wall time is known; proportional to the share of budget left unused
  let timeBonus = 0;
  if (
    answered === session.questions.length &&
    session.startedAt !== undefined &&
    session.finishedAt !== undefined
  ) {
    const usedMs = Math.max(0, session.finishedAt - session.startedAt);
    const savedFraction = Math.min(1, Math.max(0, (session.durationMs - usedMs) / session.durationMs));
    timeBonus = Math.round(base * TIME_BONUS_CAP * savedFraction);
  }

  const detail = (Object.entries(correctByDifficulty) as Array<[Difficulty, number]>)
    .map(([d, n]) => `${n}×${d}`)
    .join(' + ');

  return { base, timeBonus, total: base + timeBonus, detail };
}
