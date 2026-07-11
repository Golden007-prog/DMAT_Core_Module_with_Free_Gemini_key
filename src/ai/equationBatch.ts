import type { EquationQuestion, Question } from '../engine/types';
import type { GenerateSetConfig } from '../engine/generateSet';
import { generateQuestionAt } from '../engine/generateSet';
import { useSettings } from '../state/settingsStore';
import { toast } from '../ui/components/Toast';
import { generateJson } from './gemini';
import { salvageAiEquationSet } from './validateAi';
import { equationBatchPrompt, equationBatchSchema } from './prompts';
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
        // scoped to the band: the schema is what stops an "easy" batch coming back
        // built on four variables (see equationBatchSchema)
        schema: equationBatchSchema(cfg.difficulty),
        signal,
        dailyBudget: settings.aiDailyBudget,
        // Bulk work, and salvageAiEquationSet re-validates every system against
        // the same validator our own generator must pass — so a "cleverer" model
        // buys nothing here, while thinking on a 20-system batch costs ~7,900
        // tokens and either blows the output budget or the timeout.
        thinkingBudget: 0,
        // The construct-from-solution schema makes the model show its working
        // (see equationBatchSchema), which is the whole reason its arithmetic
        // holds up — and it costs output tokens: measured, a 20-system hard batch
        // writes ~7,000 where the old flat schema wrote ~1,500. The 8192 default
        // left barely a thousand tokens of headroom, and a batch that overruns it
        // does not degrade, it comes back MAX_TOKENS with unparseable JSON and
        // loses every system at once.
        maxOutputTokens: 12288,
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
