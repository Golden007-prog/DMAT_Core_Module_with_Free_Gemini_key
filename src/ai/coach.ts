import type { Question, Session, SubtestType } from '../engine/types';
import type { AttemptRow } from '../storage/db';
import { getStorage } from '../storage/db';
import { useSettings } from '../state/settingsStore';
import { generateJson } from './gemini';
import { sanitizeCoachPlan, sanitizeExplanation } from './validateAi';
import {
  COACH_SCHEMA,
  EXPLAIN_SCHEMA,
  coachPrompt,
  explainMistakePrompt,
  type AiCoachPlan,
  type AiExplanation,
  type CoachStats,
} from './prompts';

export type { AiCoachPlan, AiExplanation, CoachDrill, CoachLeveragePoint, ExplainStep } from './prompts';

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

/** The cache table stores strings, and rows written before the structured
 *  payloads landed hold raw prose. Anything that does not parse into the
 *  current shape is a miss and gets overwritten — never a crash. */
async function cachedStructured<T>(
  key: string,
  parse: (payload: unknown) => T | null,
): Promise<T | null> {
  const storage = await getStorage();
  const cached = await storage.aiCacheGet(key);
  if (!cached) return null;
  try {
    return parse(JSON.parse(cached));
  } catch {
    return null;
  }
}

/** G2: tutor explanation targeted at the learner's specific mistake.
 *  Cached forever per (questionSeed, userAnswer). */
export async function explainMistake(
  question: Question,
  userAnswer: unknown,
): Promise<AiExplanation> {
  const settings = useSettings.getState();
  if (!settings.geminiKey) throw new Error('AI layer not configured');

  const cacheKey = `explain:${question.seed}:${hashString(JSON.stringify(userAnswer ?? null))}`;
  const cached = await cachedStructured(cacheKey, sanitizeExplanation);
  if (cached) return cached;

  const result = await generateJson<unknown>({
    key: settings.geminiKey,
    modelChain: settings.modelChain,
    prompt: explainMistakePrompt(question, userAnswer),
    schema: EXPLAIN_SCHEMA,
    dailyBudget: settings.aiDailyBudget,
    // Short and quality-sensitive, so a thinking budget is tempting — but only
    // budget 0 is measured as accepted by every model in the chain (the lite tier
    // is natively non-thinking), and this runs inline right after a mistake. A
    // fast, well-formed explanation beats an unverified request shape.
    thinkingBudget: 0,
  });
  // R7: a malformed explanation is a failure, not a degraded render — the
  // caller falls back to the deterministic steps already on screen.
  const explanation = sanitizeExplanation(result);
  if (!explanation) throw new Error('malformed explanation');

  const storage = await getStorage();
  await storage.aiCacheSet(cacheKey, JSON.stringify(explanation));
  return explanation;
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
): Promise<AiCoachPlan> {
  const settings = useSettings.getState();
  if (!settings.geminiKey) throw new Error('AI layer not configured');

  const stats = buildStats(sessions, attempts);
  const cacheKey = `coach:${hashString(JSON.stringify(stats))}`;
  const cached = await cachedStructured(cacheKey, sanitizeCoachPlan);
  if (cached) return cached;

  const result = await generateJson<unknown>({
    key: settings.geminiKey,
    modelChain: settings.modelChain,
    prompt: coachPrompt(stats),
    schema: COACH_SCHEMA,
    dailyBudget: settings.aiDailyBudget,
    // same call as explainMistake: thinking off, for the same measured reason
    thinkingBudget: 0,
  });
  const plan = sanitizeCoachPlan(result);
  if (!plan) throw new Error('malformed plan');

  const storage = await getStorage();
  await storage.aiCacheSet(cacheKey, JSON.stringify(plan));
  return plan;
}
