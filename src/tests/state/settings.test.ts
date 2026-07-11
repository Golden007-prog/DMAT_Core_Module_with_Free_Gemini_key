import {
  DEFAULT_MODEL_CHAIN,
  RECOMMENDED_MODEL_PREFERENCE,
  RETIRED_MODEL_IDS,
} from '../../state/settingsStore';

/**
 * The chain's FIRST entry is the one every AI call pays for. Twice now a default
 * has shipped whose lead a free key could not use — v0's "gemini-3-flash" never
 * existed at all — and the cost landed on the user as dead latency on every
 * "Explain with AI" tap. These are the invariants that stop a third; the model
 * IDs themselves are an empirical question re-checked against a live key, so this
 * guards the *shape* of the chain rather than pinning a particular winner.
 */
describe('default model chain', () => {
  it('never leads with an ID known to be dead — the v0 gemini-3-flash bug', () => {
    expect(RETIRED_MODEL_IDS.has(DEFAULT_MODEL_CHAIN[0])).toBe(false);
  });

  it('ships no retired ID anywhere in the chain or the recommended preference', () => {
    for (const m of [...DEFAULT_MODEL_CHAIN, ...RECOMMENDED_MODEL_PREFERENCE]) {
      expect(RETIRED_MODEL_IDS.has(m), `${m} is retired but is still shipped`).toBe(false);
    }
  });

  it('never ships a Pro model — free-tier quotas assume scarcity', () => {
    for (const m of [...DEFAULT_MODEL_CHAIN, ...RECOMMENDED_MODEL_PREFERENCE]) {
      expect(m, `${m} is a Pro model`).not.toMatch(/-pro\b/);
    }
  });

  it('keeps a fallback behind the lead, so one bad model cannot kill the feature', () => {
    expect(DEFAULT_MODEL_CHAIN.length).toBeGreaterThanOrEqual(2);
    expect(new Set(DEFAULT_MODEL_CHAIN).size).toBe(DEFAULT_MODEL_CHAIN.length);
  });

  it('can repair every chain it has ever shipped as a default', () => {
    // both historical defaults end on gemini-2.5-flash-lite, which now 404s —
    // a user still holding one must not be left with a dead tail
    for (const shipped of [
      ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    ]) {
      for (const m of shipped.filter((id) => RETIRED_MODEL_IDS.has(id))) {
        expect(DEFAULT_MODEL_CHAIN, `${m} survived into the current default`).not.toContain(m);
      }
    }
  });
});
