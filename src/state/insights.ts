import type { Difficulty, Session, SubtestType } from '../engine/types';
import type { AttemptRow } from '../storage/db';
import { ruleTagLabel } from '../ui/ruleTagLabels';

export interface Drill {
  subtest: SubtestType;
  difficulty: Difficulty | 'mixed';
  count: 5 | 10 | 20;
}

export interface Insight {
  id: string;
  kind: 'weak-tag' | 'pacing' | 'difficulty-gap' | 'momentum' | 'guess';
  message: string;
  drill?: Drill;
}

const MIN_TAG_ATTEMPTS = 5;

const TAG_SUBTEST: Record<string, SubtestType> = {
  fig: 'figures',
  eq: 'equations',
  lat: 'latin',
};

/** §10 deterministic insight rules — run on Analytics load, no AI required. */
export function computeInsights(sessions: Session[], attempts: AttemptRow[]): Insight[] {
  const insights: Insight[] = [];

  /* weakest rule tag with ≥5 attempts and <70% accuracy → drill suggestion */
  const byTag = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    for (const tag of a.ruleTags) {
      const t = byTag.get(tag) ?? { correct: 0, total: 0 };
      t.total++;
      if (a.correct) t.correct++;
      byTag.set(tag, t);
    }
  }
  const weakTags = [...byTag.entries()]
    .filter(([, v]) => v.total >= MIN_TAG_ATTEMPTS && v.correct / v.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  if (weakTags.length > 0) {
    const [tag, v] = weakTags[0];
    const subtest = TAG_SUBTEST[tag.split('.')[0]] ?? 'figures';
    const hardTag = tag.includes('x+1') || tag.includes('chain4') || tag.includes('vars4');
    insights.push({
      id: `weak-${tag}`,
      kind: 'weak-tag',
      message: `You lose most points on ${ruleTagLabel(tag)} — ${Math.round(
        (v.correct / v.total) * 100,
      )}% accuracy over ${v.total} attempts.`,
      drill: { subtest, difficulty: hardTag ? 'hard' : 'mixed', count: 10 },
    });
  }

  /* avg time > 90 s on a subtest → pacing tip */
  const byType = new Map<SubtestType, { time: number; n: number }>();
  for (const a of attempts) {
    if (a.timeMs <= 0) continue;
    const t = byType.get(a.type) ?? { time: 0, n: 0 };
    t.time += a.timeMs;
    t.n++;
    byType.set(a.type, t);
  }
  for (const [type, v] of byType) {
    if (v.n >= 5 && v.time / v.n > 90_000) {
      insights.push({
        id: `pacing-${type}`,
        kind: 'pacing',
        message: `You average ${Math.round(v.time / v.n / 1000)} s per ${type} task — the exam budget is 75 s. Practise committing to an answer sooner; guessing costs nothing.`,
      });
    }
  }

  /* accuracy gap easy→hard > 30 points → ramp gradually */
  const byDiff = new Map<Difficulty, { correct: number; total: number }>();
  for (const a of attempts) {
    const d = byDiff.get(a.difficulty) ?? { correct: 0, total: 0 };
    d.total++;
    if (a.correct) d.correct++;
    byDiff.set(a.difficulty, d);
  }
  const easy = byDiff.get('easy');
  const hard = byDiff.get('hard');
  if (easy && hard && easy.total >= 5 && hard.total >= 5) {
    const gap = easy.correct / easy.total - hard.correct / hard.total;
    if (gap > 0.3) {
      insights.push({
        id: 'difficulty-gap',
        kind: 'difficulty-gap',
        message: `Your easy-level accuracy is ${Math.round(gap * 100)} points above hard. Ramp difficulty gradually: drill medium sets until they feel routine, then step up.`,
      });
    }
  }

  /* last-5-sessions trend → momentum message */
  const scored = sessions
    .filter((s) => s.score)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-5);
  if (scored.length >= 4) {
    const first = scored.slice(0, 2).reduce((acc, s) => acc + s.score!.accuracy, 0) / 2;
    const last = scored.slice(-2).reduce((acc, s) => acc + s.score!.accuracy, 0) / 2;
    if (last - first > 0.08) {
      insights.push({
        id: 'momentum-up',
        kind: 'momentum',
        message: `Momentum: your accuracy is improving across your last ${scored.length} sessions (${Math.round(first * 100)}% → ${Math.round(last * 100)}%). Keep the cadence.`,
      });
    } else if (first - last > 0.08) {
      insights.push({
        id: 'momentum-down',
        kind: 'momentum',
        message: `Your recent sessions dipped (${Math.round(first * 100)}% → ${Math.round(last * 100)}%). A shorter, easier set can rebuild rhythm before the next hard run.`,
      });
    }
  }

  /* >10% unanswered in exam mode → guess, never leave blanks */
  const examSessions = sessions.filter((s) => s.mode === 'exam' && s.score);
  const examTotals = examSessions.reduce(
    (acc, s) => ({
      unanswered: acc.unanswered + s.score!.unanswered,
      total: acc.total + s.score!.totalQuestions,
    }),
    { unanswered: 0, total: 0 },
  );
  if (examTotals.total > 0 && examTotals.unanswered / examTotals.total > 0.1) {
    insights.push({
      id: 'guess',
      kind: 'guess',
      message: `${Math.round(
        (examTotals.unanswered / examTotals.total) * 100,
      )}% of your exam-mode questions were left blank. There is no negative marking — always guess, never leave blanks.`,
    });
  }

  return insights;
}

/** Consecutive days with ≥1 finished session, ending today (or yesterday). */
export function computeStreakDays(sessions: Session[], now = Date.now()): number {
  const days = new Set(sessions.map((s) => Math.floor(s.createdAt / 86_400_000)));
  const today = Math.floor(now / 86_400_000);
  let start = today;
  if (!days.has(start)) {
    if (!days.has(start - 1)) return 0;
    start = start - 1;
  }
  let streak = 0;
  while (days.has(start - streak)) streak++;
  return streak;
}
