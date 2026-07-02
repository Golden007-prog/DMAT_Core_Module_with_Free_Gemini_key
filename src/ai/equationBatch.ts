import type { EquationQuestion, Question } from '../engine/types';
import type { GenerateSetConfig } from '../engine/generateSet';
import { generateQuestionAt } from '../engine/generateSet';
import { useSettings } from '../state/settingsStore';
import { toast } from '../ui/components/Toast';
import { generateJson } from './gemini';
import { salvageAiEquationSet } from './validateAi';
import { EQUATION_BATCH_SCHEMA, equationBatchPrompt } from './prompts';

/**
 * G1: one batched call generates a whole equation set; every item passes the
 * same uniqueness/grammar validator as deterministic output; failures are
 * silently replaced. Returns null when AI is off, keyless, mixed-difficulty,
 * or unavailable — the caller then uses the deterministic path (R7).
 */
export async function fetchAiEquationSet(
  cfg: GenerateSetConfig,
  signal: AbortSignal,
): Promise<{ questions: Question[]; source: 'gemini+validated' | 'mixed' } | null> {
  const settings = useSettings.getState();
  if (!settings.aiEquationsEnabled || !settings.geminiKey) return null;
  if (cfg.difficulty === 'mixed') return null; // batched prompt targets one band

  try {
    const payload = await generateJson<unknown>({
      key: settings.geminiKey,
      modelChain: settings.modelChain,
      prompt: equationBatchPrompt(cfg.count, cfg.difficulty),
      schema: EQUATION_BATCH_SCHEMA,
      signal,
      dailyBudget: settings.aiDailyBudget,
    });
    const { questions, aiAccepted } = salvageAiEquationSet(
      payload,
      cfg.count,
      cfg.difficulty,
      // cfg.subtest is 'equations' here, so the engine returns EquationQuestions
      (i) => generateQuestionAt(cfg, i) as EquationQuestion,
    );
    if (aiAccepted === 0) {
      toast('AI unavailable — using built-in generator');
      return null;
    }
    return { questions, source: aiAccepted === cfg.count ? 'gemini+validated' : 'mixed' };
  } catch {
    toast('AI unavailable — using built-in generator');
    return null;
  }
}
