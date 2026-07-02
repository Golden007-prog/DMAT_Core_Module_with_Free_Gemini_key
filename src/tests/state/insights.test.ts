import { computeInsights, computeStreakDays } from '../../state/insights';
import type { AttemptRow } from '../../storage/db';
import type { Session } from '../../engine/types';

const DAY = 86_400_000;

function attempt(over: Partial<AttemptRow>): AttemptRow {
  return {
    id: crypto.randomUUID(),
    sessionId: 's1',
    questionId: crypto.randomUUID(),
    type: 'figures',
    difficulty: 'medium',
    ruleTags: ['fig.move.axis'],
    correct: true,
    timeMs: 60_000,
    ts: Date.now(),
    ...over,
  };
}

function session(over: Partial<Session>): Session {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    mode: 'practice',
    subtest: 'figures',
    difficulty: 'medium',
    questionCount: 10,
    durationMs: 750_000,
    seed: 1,
    questions: [],
    answers: {},
    answerTimesMs: {},
    flagged: [],
    state: 'finished',
    generatorSource: 'deterministic',
    score: {
      totalQuestions: 10,
      correct: 7,
      wrong: 3,
      unanswered: 0,
      accuracy: 0.7,
      perDifficulty: {},
      perRuleTag: {},
      totalTimeMs: 600_000,
      avgTimePerQuestionMs: 60_000,
      perQuestionTimeMs: {},
    },
    ...over,
  };
}

describe('computeInsights (§10 deterministic rules)', () => {
  it('flags the weakest rule tag with ≥5 attempts under 70% and suggests a drill', () => {
    const attempts = [
      ...Array.from({ length: 4 }, () => attempt({ ruleTags: ['fig.accel.x+1'], correct: false })),
      ...Array.from({ length: 4 }, () => attempt({ ruleTags: ['fig.accel.x+1'], correct: true })),
      ...Array.from({ length: 6 }, () => attempt({ ruleTags: ['fig.move.axis'], correct: true })),
    ];
    const insights = computeInsights([session({})], attempts);
    const weak = insights.find((i) => i.kind === 'weak-tag');
    expect(weak).toBeDefined();
    expect(weak!.message).toMatch(/x\+1/i);
    expect(weak!.drill).toBeDefined();
    expect(weak!.drill!.subtest).toBe('figures');
  });

  it('does not flag tags with fewer than 5 attempts (noise gate)', () => {
    const attempts = Array.from({ length: 4 }, () =>
      attempt({ ruleTags: ['lat.chain4plus'], type: 'latin', correct: false }),
    );
    const insights = computeInsights([session({})], attempts);
    expect(insights.find((i) => i.kind === 'weak-tag')).toBeUndefined();
  });

  it('raises a pacing tip when a subtest averages over 90 s per question', () => {
    const attempts = Array.from({ length: 6 }, () => attempt({ timeMs: 100_000 }));
    const insights = computeInsights([session({})], attempts);
    expect(insights.find((i) => i.kind === 'pacing')).toBeDefined();
  });

  it('suggests ramping gradually when easy→hard accuracy gap exceeds 30 points', () => {
    const attempts = [
      ...Array.from({ length: 6 }, () => attempt({ difficulty: 'easy', correct: true })),
      ...Array.from({ length: 5 }, () => attempt({ difficulty: 'hard', correct: false })),
      attempt({ difficulty: 'hard', correct: true }),
    ];
    const insights = computeInsights([session({})], attempts);
    expect(insights.find((i) => i.kind === 'difficulty-gap')).toBeDefined();
  });

  it('reports momentum across the last five sessions', () => {
    const up = [0.4, 0.5, 0.6, 0.7, 0.8].map((a, i) =>
      session({
        createdAt: Date.now() - (5 - i) * DAY,
        score: { ...session({}).score!, accuracy: a },
      }),
    );
    const insights = computeInsights(up, []);
    const momentum = insights.find((i) => i.kind === 'momentum');
    expect(momentum).toBeDefined();
    expect(momentum!.message).toMatch(/improv|up/i);
  });

  it('tells exam-mode blank-leavers to guess (no negative marking)', () => {
    const s = session({
      mode: 'exam',
      score: { ...session({}).score!, unanswered: 3, totalQuestions: 10 },
    });
    const insights = computeInsights([s], []);
    expect(insights.find((i) => i.kind === 'guess')).toBeDefined();
  });
});

describe('computeStreakDays', () => {
  it('counts consecutive practice days ending today', () => {
    const now = Date.now();
    const sessions = [
      session({ createdAt: now }),
      session({ createdAt: now - DAY }),
      session({ createdAt: now - 2 * DAY }),
      session({ createdAt: now - 5 * DAY }), // gap breaks the streak
    ];
    expect(computeStreakDays(sessions, now)).toBe(3);
  });

  it('returns 0 when there is no session today or yesterday', () => {
    expect(computeStreakDays([session({ createdAt: Date.now() - 3 * DAY })], Date.now())).toBe(0);
  });
});
