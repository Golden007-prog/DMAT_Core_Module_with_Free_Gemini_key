// @vitest-environment node
import { describe, expect, it } from 'vitest';

/**
 * LIVE Gemini GAM generation — runs ONLY when GEMINI_LIVE=1 and a key is in
 * the environment, so CI stays deterministic and offline. Exercises the real
 * production path end-to-end: settings gate → prompt/schema → model chain →
 * salvage firewall → the same validator the seed bank passes → Dexie cache.
 */
const LIVE = process.env.GEMINI_LIVE === '1' && !!process.env.GEMINI_API_KEY;

describe.skipIf(!LIVE)('LIVE: Gemini GAM passage generation', () => {
  it('generates a valid passage end-to-end through fetchAiGamPassage', async () => {
    const { useSettings } = await import('../../state/settingsStore');
    const { fetchAiGamPassage } = await import('../../ai/gamBatch');
    const { validateGamPassage } = await import('../../engine/gam/validate');
    const { getStorage } = await import('../../storage/db');

    useSettings.setState({ geminiKey: process.env.GEMINI_API_KEY!, aiGamEnabled: true });

    const passage = await fetchAiGamPassage({
      topicArea: 'economics',
      difficulty: 'medium',
      signal: new AbortController().signal,
    });

    expect(
      passage,
      'fetchAiGamPassage returned null — key invalid, whole model chain walled, or output failed the firewall',
    ).not.toBeNull();

    const check = validateGamPassage(passage!);
    expect(check.reasons).toEqual([]);

    const words = passage!.passageMarkdown.split(/\s+/).filter(Boolean).length;
    const skills = [...new Set(passage!.questions.flatMap((q) => q.skillTags))];
    console.log(
      `LIVE OK: "${passage!.title}" — ${words} words, ${passage!.questions.length} questions, ` +
        `topic=${passage!.topicArea}, difficulty=${passage!.difficulty}, skills=${skills.join('+')}`,
    );

    // the generated passage must be reusable offline: cached in Dexie
    const rows = await (await getStorage()).gamPassagesAll();
    expect(rows.some((r) => r.passage.id === passage!.id)).toBe(true);
  }, 150_000);
});
