import type { Question, Session, SubtestType } from '../engine/types';
import type { AttemptRow } from '../storage/db';
import { getStorage } from '../storage/db';
import { useSettings } from '../state/settingsStore';
import { generateJson } from './gemini';
import { sanitizePlainText } from './validateAi';
import {
  COACH_SCHEMA,
  EXPLAIN_SCHEMA,
  coachPrompt,
  explainMistakePrompt,
  type CoachStats,
} from './prompts';

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** G2: tutor explanation targeted at the learner's specific mistake.
 *  Cached forever per (questionSeed, userAnswer). */
export async function explainMistake(question: Question, userAnswer: unknown): Promise<string> {
  const settings = useSettings.getState();
  if (!settings.geminiKey) throw new Error('AI layer not configured');

  const cacheKey = `explain:${question.seed}:${hashString(JSON.stringify(userAnswer ?? null))}`;
  const storage = await getStorage();
  const cached = await storage.aiCacheGet(cacheKey);
  if (cached) return cached;

  const result = await generateJson<{ explanation: string }>({
    key: settings.geminiKey,
    modelChain: settings.modelChain,
    prompt: explainMistakePrompt(question, userAnswer),
    schema: EXPLAIN_SCHEMA,
    dailyBudget: settings.aiDailyBudget,
  });
  const text = sanitizePlainText(result.explanation ?? '');
  if (!text) throw new Error('empty explanation');
  await storage.aiCacheSet(cacheKey, text);
  return text;
}

function buildStats(sessions: Session[], attempts: AttemptRow[]): CoachStats {
  const perSubtest: CoachStats['perSubtest'] = {};
  for (const type of ['figures', 'equations', 'latin'] as SubtestType[]) {
    const rows = attempts.filter((a) => a.type === type);
    if (rows.length === 0) continue;
    const timed = rows.filter((r) => r.timeMs > 0);
    perSubtest[type] = {
      accuracy: rows.filter((r) => r.correct).length / rows.length,
      avgTimeSec:
        timed.length > 0
          ? Math.round(timed.reduce((a, r) => a + r.timeMs, 0) / timed.length / 1000)
          : 0,
      attempts: rows.length,
    };
  }

  const byTag = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    for (const tag of a.ruleTags) {
      const t = byTag.get(tag) ?? { correct: 0, total: 0 };
      t.total++;
      if (a.correct) t.correct++;
      byTag.set(tag, t);
    }
  }
  const weakestTags = [...byTag.entries()]
    .filter(([, v]) => v.total >= 5)
    .map(([tag, v]) => ({ tag, accuracy: v.correct / v.total, attempts: v.total }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const exam = sessions.filter((s) => s.mode === 'exam' && s.score);
  const examTotal = exam.reduce((a, s) => a + s.score!.totalQuestions, 0);
  const examBlank = exam.reduce((a, s) => a + s.score!.unanswered, 0);

  return {
    sessions: sessions.length,
    overallAccuracy:
      attempts.length > 0 ? attempts.filter((a) => a.correct).length / attempts.length : 0,
    perSubtest,
    weakestTags,
    unansweredShareExam: examTotal > 0 ? examBlank / examTotal : 0,
  };
}

/** G3: coaching narrative from aggregated stats only (never raw personal
 *  data). Cached per stats-hash. */
export async function coachNarrative(
  sessions: Session[],
  attempts: AttemptRow[],
): Promise<string> {
  const settings = useSettings.getState();
  if (!settings.geminiKey) throw new Error('AI layer not configured');

  const stats = buildStats(sessions, attempts);
  const cacheKey = `coach:${hashString(JSON.stringify(stats))}`;
  const storage = await getStorage();
  const cached = await storage.aiCacheGet(cacheKey);
  if (cached) return cached;

  const result = await generateJson<{ plan: string }>({
    key: settings.geminiKey,
    modelChain: settings.modelChain,
    prompt: coachPrompt(stats),
    schema: COACH_SCHEMA,
    dailyBudget: settings.aiDailyBudget,
  });
  const text = sanitizePlainText(result.plan ?? '');
  if (!text) throw new Error('empty plan');
  await storage.aiCacheSet(cacheKey, text);
  return text;
}
