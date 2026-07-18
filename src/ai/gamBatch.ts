import type { Difficulty, GamPassage, GamTopicArea } from '../engine/types';
import { useSettings } from '../state/settingsStore';
import { getStorage } from '../storage/db';
import { gamContentHash } from '../engine/gam/validate';
import { contributeGamPassages } from '../cloud/gamPool';
import { generateJson } from './gemini';
import { gamPassagePrompt, gamPassageSchema } from './prompts';
import { salvageGamPassage } from './validateAi';

/**
 * GAM passage provider: one call generates a brand-new passage for a topic area,
 * re-validated locally against the same validator the seed bank must pass, then
 * persisted and contributed to the community pool (content-hash deduplicated).
 * Mirrors ai/equationBatch.ts, with one difference — there is no deterministic
 * GAM generator to fall back to, so the caller falls back to the seed / pool
 * bank on null rather than to a local generator.
 *
 * Gated on the user having a key AND aiGamEnabled. ANY failure — no key, the
 * whole model chain down, a malformed or plagiarised payload, an abort — returns
 * null with no toast (R7: AI never gates).
 */
export async function fetchAiGamPassage(opts: {
  topicArea: GamTopicArea;
  difficulty: Difficulty;
  signal: AbortSignal;
}): Promise<GamPassage | null> {
  const settings = useSettings.getState();
  // gate FIRST, before any storage read, bank import or network — a keyless call
  // must cost nothing and touch no fetch
  if (!settings.geminiKey || !settings.aiGamEnabled) return null;

  try {
    // GAM_BANK is imported lazily so the passage-bank chunk stays split out of the
    // core bundle (see content/gam/index.ts) — it is the REAL seed bank the
    // overlap check needs, not a copy
    const { GAM_BANK } = await import('../content/gam/bank');
    const seedBank = GAM_BANK.map((p) => ({ title: p.title, passageMarkdown: p.passageMarkdown }));

    const storage = await getStorage();
    const cached = await storage.gamPassagesAll();
    const bannedTitles = [...GAM_BANK.map((p) => p.title), ...cached.map((r) => r.passage.title)];

    const payload = await generateJson<unknown>({
      key: settings.geminiKey,
      modelChain: settings.modelChain,
      prompt: gamPassagePrompt(opts.topicArea, opts.difficulty, bannedTitles),
      schema: gamPassageSchema(),
      signal: opts.signal,
      dailyBudget: settings.aiDailyBudget,
      // a whole passage plus 6-7 questions is far more output than an equation
      // batch, and thinking off is the measured-safe request shape for the chain
      thinkingBudget: 0,
      timeoutMs: 60_000,
      maxOutputTokens: 12288,
    });

    const passage = salvageGamPassage(payload, opts.topicArea, opts.difficulty, seedBank);
    if (!passage) return null;

    await storage.gamPassagesPut([
      {
        hash: gamContentHash(passage),
        topicArea: passage.topicArea,
        difficulty: passage.difficulty,
        passage,
        addedAt: Date.now(),
      },
    ]);
    // share with every signed-in user, deduplicated — fire-and-forget, never
    // block the passage on the network round-trip
    void contributeGamPassages([passage]).catch(() => {});
    return passage;
  } catch {
    return null;
  }
}
