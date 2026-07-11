import { computeSessionPoints, POINTS_PER_CORRECT, MIXED_SET_MULTIPLIER } from '../../state/points';
import { weekKey, leagueFor, LEAGUES } from '../../cloud/rankings';
import { createSession, transition } from '../../state/sessionMachine';
import { generateSet } from '../../engine/generateSet';
import type { LatinQuestion, Session } from '../../engine/types';

function finishedLatinSession(opts: {
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  count?: number;
  correct?: number; // how many answered correctly
  answered?: number; // how many answered at all (>= correct)
  usedMs?: number; // wall time used
}): Session {
  const difficulty = opts.difficulty ?? 'easy';
  const count = opts.count ?? (difficulty === 'mixed' ? 6 : 4);
  const answered = opts.answered ?? count;
  const correct = opts.correct ?? answered;

  let s = createSession({ mode: 'practice', subtest: 'latin', difficulty, questionCount: count, seed: 7 });
  s = transition(s, { type: 'GENERATE' });
  s = transition(s, {
    type: 'GENERATED',
    questions: generateSet({ subtest: 'latin', difficulty, count, seed: 7 }),
  });
  const startedAt = 1_000_000;
  s = transition(s, { type: 'START', startedAt, endsAt: startedAt + s.durationMs });
  for (let i = 0; i < answered; i++) {
    const q = s.questions[i] as LatinQuestion;
    const value =
      i < correct
        ? q.solutionLetter
        : ((['A', 'B', 'C', 'D', 'E'] as const).find((l) => l !== q.solutionLetter) ?? 'A');
    s = transition(s, { type: 'ANSWER', questionId: q.id, value, timeMs: 1000 });
  }
  return transition(s, { type: 'SUBMIT', finishedAt: startedAt + (opts.usedMs ?? s.durationMs) });
}

describe('computeSessionPoints', () => {
  it('awards difficulty-weighted base points per correct answer', () => {
    const s = finishedLatinSession({ difficulty: 'hard', count: 4, correct: 3, usedMs: 4 * 75_000 });
    const p = computeSessionPoints(s);
    expect(p.base).toBe(3 * POINTS_PER_CORRECT.hard);
    expect(p.timeBonus).toBe(0); // used the full budget
    expect(p.total).toBe(p.base);
  });

  it('mixed sets earn the mixed multiplier on top of per-question difficulty points', () => {
    const s = finishedLatinSession({ difficulty: 'mixed', count: 6, correct: 6, usedMs: 6 * 75_000 });
    const p = computeSessionPoints(s);
    // 6-question mixed ramp: 2 easy + 2 medium + 2 hard
    const raw = 2 * POINTS_PER_CORRECT.easy + 2 * POINTS_PER_CORRECT.medium + 2 * POINTS_PER_CORRECT.hard;
    expect(p.base).toBe(Math.round(raw * MIXED_SET_MULTIPLIER));
  });

  it('grants a time bonus proportional to time saved — only when every question is answered', () => {
    // finished in half the time, all answered, all correct
    const fast = finishedLatinSession({ difficulty: 'medium', count: 4, usedMs: 2 * 75_000 });
    const p = computeSessionPoints(fast);
    expect(p.base).toBe(4 * POINTS_PER_CORRECT.medium);
    expect(p.timeBonus).toBe(Math.round(p.base * 0.5 * 0.5)); // 50% cap × 50% saved
    expect(p.total).toBe(p.base + p.timeBonus);

    // same speed but one question left blank → no bonus
    const blank = finishedLatinSession({
      difficulty: 'medium',
      count: 4,
      answered: 3,
      correct: 3,
      usedMs: 2 * 75_000,
    });
    expect(computeSessionPoints(blank).timeBonus).toBe(0);
  });

  it('wrong answers earn nothing — racing through garbage cannot farm points', () => {
    const garbage = finishedLatinSession({ difficulty: 'hard', count: 4, correct: 0, usedMs: 10_000 });
    const p = computeSessionPoints(garbage);
    expect(p.base).toBe(0);
    expect(p.timeBonus).toBe(0);
    expect(p.total).toBe(0);
  });
});

describe('weekKey', () => {
  it('uses ISO weeks (Monday start, UTC)', () => {
    expect(weekKey(new Date(Date.UTC(2026, 6, 3)))).toBe('2026-W27'); // Fri 2026-07-03
    expect(weekKey(new Date(Date.UTC(2026, 6, 6)))).toBe('2026-W28'); // Mon 2026-07-06
    expect(weekKey(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-W01');
    expect(weekKey(new Date(Date.UTC(2027, 0, 3)))).toBe('2026-W53'); // Sun of prior ISO year
  });
});

describe('leagueFor', () => {
  it('maps weekly points to ordered leagues', () => {
    expect(leagueFor(0).name).toBe('Bronze');
    expect(leagueFor(LEAGUES[1].minPoints).name).toBe('Silver');
    expect(leagueFor(LEAGUES[2].minPoints + 5).name).toBe('Gold');
    expect(leagueFor(99_999).name).toBe(LEAGUES[LEAGUES.length - 1].name);
    // thresholds strictly increase
    for (let i = 1; i < LEAGUES.length; i++) {
      expect(LEAGUES[i].minPoints).toBeGreaterThan(LEAGUES[i - 1].minPoints);
    }
  });
});
