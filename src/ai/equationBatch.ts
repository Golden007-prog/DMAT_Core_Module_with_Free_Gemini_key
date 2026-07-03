import type { EquationQuestion, Question } from '../engine/types';
import type { GenerateSetConfig } from '../engine/generateSet';
import { generateQuestionAt } from '../engine/generateSet';
import { useSettings } from '../state/settingsStore';
import { toast } from '../ui/components/Toast';
import { generateJson } from './gemini';
import { salvageAiEquationSet } from './validateAi';
import { EQUATION_BATCH_SCHEMA, equationBatchPrompt } from './prompts';
import { aiOnly, contributeQuestions, pullPoolEquationSet } from '../cloud/questionPool';

/**
 * Equation-set provider chain (single-difficulty sets, AI toggle on):
 *   1. User has a Gemini key → one batched call generates a brand-new set;
 *      every system is re-validated locally; the validated AI questions are
 *      contributed to the shared community pool (content-hash deduplicated).
 *   2. No key, or the model chain failed → pull an unseen set from the
 *      community pool (one fast read — this is how keyless users get AI
 *      variety with minimal load time).
 *   3. Anything else → null, and the caller uses the deterministic
 *      generator (R7: AI never gates).
 */
export async function fetchAiEquationSet(
  cfg: GenerateSetConfig,
  signal: AbortSignal,
): Promise<{ questions: Question[]; source: 'gemini+validated' | 'mixed' } | null> {
  const settings = useSettings.getState();
  if (!settings.aiEquationsEnabled) return null;
  if (cfg.difficulty === 'mixed') return null; // batched prompt targets one band

  if (settings.geminiKey) {
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
      if (aiAccepted > 0) {
        // share the freshly generated questions with everyone (deduplicated)
        void contributeQuestions(aiOnly(questions), 'gemini+validated').catch(() => {});
        return { questions, source: aiAccepted === cfg.count ? 'gemini+validated' : 'mixed' };
      }
    } catch {
      /* fall through to the community pool */
    }
  }

  const pooled = await pullPoolEquationSet(cfg).catch(() => null);
  if (pooled) return pooled;

  if (settings.geminiKey) toast('AI unavailable — using built-in generator');
  return null;
}
