import {
  weekKey,
  msUntilWeeklyReset,
  leagueFor,
  nextLeague,
  moduleForSubtest,
  bucketSessionsByModule,
  combineLeaderboardRows,
  LEAGUES,
  type WeeklyScoreRow,
} from '../../cloud/rankings';
import { computeScore } from '../../state/scoring';
import type { Difficulty, GamQuestion, LatinQuestion, Question, Session } from '../../engine/types';

/* ------------------------------ ISO weeks --------------------------------- */

describe('weekKey', () => {
  it('keys ISO-8601 weeks in UTC (Monday start)', () => {
    expect(weekKey(new Date(Date.UTC(2026, 6, 6)))).toBe('2026-W28'); // Mon 2026-07-06
    expect(weekKey(new Date(Date.UTC(2026, 6, 8)))).toBe('2026-W28'); // Wed, same week
  });

  it('lets the Thursday decide the ISO year at a year boundary', () => {
    // 2019-12-31 is a Tuesday; its ISO Thursday lands in 2020 → W01 of 2020
    expect(weekKey(new Date(Date.UTC(2019, 11, 31)))).toBe('2020-W01');
    // 2020-12-31 is itself a Thursday → the last week of ISO 2020
    expect(weekKey(new Date(Date.UTC(2020, 11, 31)))).toBe('2020-W53');
  });
});

describe('msUntilWeeklyReset', () => {
  it('is a positive span to the next Monday 00:00 UTC', () => {
    expect(msUntilWeeklyReset(new Date(Date.UTC(2026, 6, 8, 12)))).toBeGreaterThan(0);
    // from a Monday 00:00 the next reset is exactly one week away
    expect(msUntilWeeklyReset(new Date(Date.UTC(2026, 6, 6, 0, 0, 0)))).toBe(7 * 86_400_000);
  });
});

/* -------------------------------- leagues --------------------------------- */

describe('leagueFor / nextLeague', () => {
  it('maps points to the highest league at or below them', () => {
    expect(leagueFor(0).name).toBe('Bronze');
    expect(leagueFor(799).name).toBe('Silver'); // just under Gold (800)
    expect(leagueFor(800).name).toBe('Gold'); // exact threshold
    expect(leagueFor(16_000).name).toBe('Immortal'); // top tier at its floor
    expect(leagueFor(999_999).name).toBe('Immortal');
  });

  it('points to the next tier, or null at the top', () => {
    expect(nextLeague(0)?.name).toBe('Silver');
    expect(nextLeague(15_999)?.name).toBe('Immortal');
    expect(nextLeague(16_000)).toBeNull();
    expect(LEAGUES[0].minPoints).toBe(0);
  });
});

/* -------------------------------- modules --------------------------------- */

describe('moduleForSubtest', () => {
  it('routes gam to the gam board and every other subtest to core', () => {
    expect(moduleForSubtest('gam')).toBe('gam');
    for (const subtest of ['figures', 'equations', 'latin', 'full-core', 'full-dmat'] as const) {
      expect(moduleForSubtest(subtest)).toBe('core');
    }
  });
});

/* --------------------------- session bucketing ---------------------------- */

const IN_WEEK = Date.UTC(2026, 6, 8); // Wed 2026-07-08 → ISO 2026-W28
const OTHER_WEEK = Date.UTC(2026, 6, 1); // Wed 2026-07-01 → ISO 2026-W27
const WEEK = weekKey(new Date(IN_WEEK));

function coreQuestion(id: string, difficulty: Difficulty): LatinQuestion {
  return {
    id,
    type: 'latin',
    difficulty,
    seed: 0,
    ruleTags: [],
    grid: [],
    question: { row: 0, col: 0 },
    solutionLetter: 'A',
    inferenceDepth: 1,
    explanationSteps: [],
  };
}

function gamQuestion(id: string, difficulty: Difficulty): GamQuestion {
  return {
    id,
    type: 'gam',
    passageId: 'p',
    difficulty,
    seed: 0,
    ruleTags: [],
    stem: '',
    options: ['a', 'b', 'c', 'd'],
    correct: 0,
    explanation: '',
    skillTags: [],
  };
}

/** A finished session with a known point total: every question is 'hard'
 *  (35 pts) and no time bonus applies (no startedAt/finishedAt), so a correct
 *  hard answer is worth exactly 35 points. */
function makeSession(opts: {
  subtest: Session['subtest'];
  createdAt: number;
  specs: Array<{ difficulty: Difficulty; correct: boolean }>;
  scored?: boolean;
}): Session {
  const isGam = moduleForSubtest(opts.subtest) === 'gam';
  const questions: Question[] = opts.specs.map((s, i) =>
    isGam ? gamQuestion(`q${i}`, s.difficulty) : coreQuestion(`q${i}`, s.difficulty),
  );
  const answers: Record<string, unknown> = {};
  opts.specs.forEach((s, i) => {
    answers[questions[i].id] = isGam ? (s.correct ? 0 : 1) : s.correct ? 'A' : 'B';
  });
  const session: Session = {
    id: `s-${opts.createdAt}-${opts.subtest}`,
    createdAt: opts.createdAt,
    mode: 'practice',
    subtest: opts.subtest,
    difficulty: 'hard',
    questionCount: questions.length,
    durationMs: questions.length * 75_000,
    seed: 0,
    questions,
    answers,
    answerTimesMs: {},
    flagged: [],
    state: 'finished',
    generatorSource: 'deterministic',
  };
  if (opts.scored !== false) session.score = computeScore({ questions, answers });
  return session;
}

describe('bucketSessionsByModule', () => {
  it("groups a week's scored sessions by module, summing points and counts", () => {
    const sessions = [
      makeSession({
        subtest: 'latin',
        createdAt: IN_WEEK,
        specs: [
          { difficulty: 'hard', correct: true },
          { difficulty: 'hard', correct: true },
        ],
      }), // core: +70, 1 session
      makeSession({ subtest: 'figures', createdAt: IN_WEEK, specs: [{ difficulty: 'hard', correct: true }] }), // core: +35, 1
      makeSession({ subtest: 'full-dmat', createdAt: IN_WEEK, specs: [{ difficulty: 'hard', correct: false }] }), // core: +0 but counts, 1
      makeSession({ subtest: 'gam', createdAt: IN_WEEK, specs: [{ difficulty: 'hard', correct: true }] }), // gam: +35, 1
      makeSession({ subtest: 'latin', createdAt: OTHER_WEEK, specs: [{ difficulty: 'hard', correct: true }] }), // wrong week → excluded
      makeSession({
        subtest: 'gam',
        createdAt: IN_WEEK,
        specs: [{ difficulty: 'hard', correct: true }],
        scored: false,
      }), // no score → excluded
    ];

    const buckets = bucketSessionsByModule(sessions, WEEK);
    expect(buckets.find((b) => b.module === 'core')).toEqual({ module: 'core', points: 105, sessions: 3 });
    expect(buckets.find((b) => b.module === 'gam')).toEqual({ module: 'gam', points: 35, sessions: 1 });
  });

  it('returns nothing when no session falls in the target week', () => {
    const sessions = [
      makeSession({ subtest: 'latin', createdAt: OTHER_WEEK, specs: [{ difficulty: 'hard', correct: true }] }),
    ];
    expect(bucketSessionsByModule(sessions, WEEK)).toEqual([]);
  });
});

/* --------------------------- combined leaderboard ------------------------- */

describe('combineLeaderboardRows', () => {
  it("sums a user's module rows and re-sorts by combined points", () => {
    const rows: WeeklyScoreRow[] = [
      { user_id: 'u1', points: 100, sessions: 2, display_name: 'One', avatar_url: null, updated_at: '2026-07-08T10:00:00Z' },
      { user_id: 'u2', points: 250, sessions: 3, display_name: 'Two', avatar_url: null, updated_at: '2026-07-08T09:00:00Z' },
      { user_id: 'u1', points: 200, sessions: 1, display_name: 'One-later', avatar_url: 'a.png', updated_at: '2026-07-08T12:00:00Z' },
    ];

    const combined = combineLeaderboardRows(rows);
    expect(combined.map((r) => r.user_id)).toEqual(['u1', 'u2']); // u1 300 > u2 250
    expect(combined[0].points).toBe(300);
    expect(combined[0].sessions).toBe(3);
    // the most recently updated snapshot wins the denormalized name/avatar
    expect(combined[0].display_name).toBe('One-later');
    expect(combined[0].avatar_url).toBe('a.png');
  });

  it('does not mutate the input rows', () => {
    const rows: WeeklyScoreRow[] = [
      { user_id: 'u1', points: 100, sessions: 1, display_name: 'One', avatar_url: null, updated_at: '2026-07-08T10:00:00Z' },
      { user_id: 'u1', points: 50, sessions: 1, display_name: 'One', avatar_url: null, updated_at: '2026-07-08T11:00:00Z' },
    ];
    combineLeaderboardRows(rows);
    expect(rows[0].points).toBe(100);
  });
});
