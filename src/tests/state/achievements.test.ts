import { computeAchievements } from '../../state/achievements';
import type { Session } from '../../engine/types';
import type { AttemptRow } from '../../storage/db';

function session(over: Partial<Session>): Session {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    mode: 'practice',
    subtest: 'latin',
    difficulty: 'easy',
    questionCount: 5,
    durationMs: 375_000,
    seed: 1,
    questions: [],
    answers: {},
    answerTimesMs: {},
    flagged: [],
    state: 'finished',
    generatorSource: 'deterministic',
    score: {
      totalQuestions: 5,
      correct: 5,
      wrong: 0,
      unanswered: 0,
      accuracy: 1,
      perDifficulty: {},
      perRuleTag: {},
      totalTimeMs: 100_000,
      avgTimePerQuestionMs: 20_000,
      perQuestionTimeMs: {},
    },
    ...over,
  };
}

function attempts(n: number, over: Partial<AttemptRow> = {}): AttemptRow[] {
  return Array.from({ length: n }, () => ({
    id: crypto.randomUUID(),
    sessionId: 's',
    questionId: crypto.randomUUID(),
    type: 'latin',
    difficulty: 'easy',
    ruleTags: [],
    correct: true,
    timeMs: 1000,
    ts: Date.now(),
    ...over,
  }));
}

describe('computeAchievements', () => {
  it('starts empty and unlocks first-steps after one session', () => {
    const none = computeAchievements([], []);
    expect(none.every((a) => !a.earned)).toBe(true);
    const one = computeAchievements([session({})], []);
    expect(one.find((a) => a.id === 'first-steps')!.earned).toBe(true);
    expect(one.find((a) => a.id === 'perfect-set')!.earned).toBe(true); // 5/5 correct
  });

  it('tracks progress toward count badges', () => {
    const result = computeAchievements([], attempts(64));
    const century = result.find((a) => a.id === 'century')!;
    expect(century.earned).toBe(false);
    expect(century.progress).toBe('64/100');
    expect(computeAchievements([], attempts(150)).find((a) => a.id === 'century')!.earned).toBe(true);
  });

  it('speed demon needs full completion, half time, and 80%+', () => {
    const fast = session({
      startedAt: 0,
      finishedAt: 150_000, // 40% of budget
      score: { ...session({}).score!, accuracy: 0.8, unanswered: 0 },
    });
    expect(computeAchievements([fast], []).find((a) => a.id === 'speed-demon')!.earned).toBe(true);
    const blank = session({
      startedAt: 0,
      finishedAt: 150_000,
      score: { ...session({}).score!, accuracy: 0.8, unanswered: 1 },
    });
    expect(computeAchievements([blank], []).find((a) => a.id === 'speed-demon')!.earned).toBe(false);
  });

  it('exam-ready requires a 20-task exam in each subtest', () => {
    const runs = (['figures', 'equations', 'latin'] as const).map((t) =>
      session({ subtest: t, mode: 'exam', questionCount: 20 }),
    );
    expect(computeAchievements(runs, []).find((a) => a.id === 'exam-ready')!.earned).toBe(true);
    expect(
      computeAchievements(runs.slice(0, 2), []).find((a) => a.id === 'exam-ready')!.progress,
    ).toBe('2/3');
  });
});
