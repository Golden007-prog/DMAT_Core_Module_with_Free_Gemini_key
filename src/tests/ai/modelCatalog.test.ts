import {
  MODEL_CATALOG,
  PICKER_MODELS,
  RECOMMENDED_CHAIN,
  RECOMMENDED_PREFERENCE,
  RETIRED_MODEL_IDS,
  SELECTABLE_MODELS,
  catalogEntry,
  freeRequestCap,
  isBillingOnly,
  isRetired,
} from '../../ai/modelCatalog';
import { DEFAULT_MODEL_CHAIN } from '../../state/settingsStore';

/**
 * The catalogue is the app's only source of truth for model IDs, so these are the
 * invariants that stop a fourth shipped-default disaster: a lead model that never
 * existed (v0), a dead tail (v1), and a lead capped at 20 requests a day (v2).
 */
describe('model catalogue', () => {
  it('has no duplicate IDs — a duplicate silently shadows a measurement', () => {
    const ids = MODEL_CATALOG.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('records the measured 20/day ceiling — the fact that decides the chain order', () => {
    expect(freeRequestCap('gemini-3.5-flash')).toBe(20);
    expect(freeRequestCap('gemini-3-flash-preview')).toBe(20);
    // the lead model kept answering after ~50 calls in one day: no cap observed
    expect(freeRequestCap('gemini-3.1-flash-lite')).toBeUndefined();
  });

  it('leads with the uncapped model and escalates into the capped ones', () => {
    expect(RECOMMENDED_CHAIN).toEqual([
      'gemini-3.1-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
    ]);
    expect(freeRequestCap(RECOMMENDED_CHAIN[0])).toBeUndefined();
    expect(DEFAULT_MODEL_CHAIN).toEqual([...RECOMMENDED_CHAIN]);
  });

  for (const [name, chain] of [
    ['DEFAULT_MODEL_CHAIN', DEFAULT_MODEL_CHAIN],
    ['RECOMMENDED_CHAIN', RECOMMENDED_CHAIN],
    ['RECOMMENDED_PREFERENCE', RECOMMENDED_PREFERENCE],
  ] as const) {
    it(`${name} contains only catalogued, free, text-capable models`, () => {
      for (const id of chain) {
        const entry = catalogEntry(id);
        expect(entry, `${id} is not in the catalogue`).toBeDefined();
        expect(entry!.tier, `${id} is not free-tier`).toBe('free');
        expect(entry!.capability, `${id} cannot generate text`).toBe('text');
      }
    });

    it(`${name} recommends no retired and no billing-only model`, () => {
      for (const id of chain) {
        expect(isRetired(id), `${id} is retired but is still recommended`).toBe(false);
        expect(isBillingOnly(id), `${id} needs billing but is still recommended`).toBe(false);
        expect(RETIRED_MODEL_IDS.has(id)).toBe(false);
      }
    });
  }

  it('knows which 429s are walls and which are buckets', () => {
    // identical HTTP status, opposite advice — this is the whole reason the file exists
    expect(isBillingOnly('gemini-2.5-pro')).toBe(true);
    expect(isBillingOnly('gemini-3.1-pro-preview')).toBe(true);
    expect(isBillingOnly('gemini-3.5-flash')).toBe(false);
  });

  it('marks the IDs that 404 as retired, including the one that never existed', () => {
    expect(isRetired('gemini-3-flash')).toBe(true); // display name only, never an ID
    expect(isRetired('gemini-2.5-flash-lite')).toBe(true); // "no longer available to new users"
    expect(RETIRED_MODEL_IDS.has('gemini-flash-latest')).toBe(true);
    expect(catalogEntry('gemini-does-not-exist')).toBeUndefined();
    expect(isBillingOnly('gemini-does-not-exist')).toBe(false);
  });

  it('never offers a model that cannot generate text', () => {
    // live-translate is real and its WebSocket handshake works on a free key — it
    // just cannot answer a JSON prompt, so it must never reach a chain
    const live = catalogEntry('gemini-3.5-live-translate-preview')!;
    expect(live.capability).toBe('live-audio');
    expect(live.status).toBe('wrong-capability');
    for (const list of [SELECTABLE_MODELS, PICKER_MODELS]) {
      expect(list.map((m) => m.id)).not.toContain('gemini-3.5-live-translate-preview');
      expect(list.every((m) => m.capability === 'text')).toBe(true);
      expect(list.every((m) => m.status !== 'retired')).toBe(true);
    }
    // a billing model stays visible in the picker (disabled, with a reason) but is
    // never selectable
    expect(SELECTABLE_MODELS.every((m) => m.tier === 'free')).toBe(true);
    expect(PICKER_MODELS.map((m) => m.id)).toContain('gemini-2.5-pro');
  });

  it('states measured behaviour in every note, not marketing copy', () => {
    for (const m of MODEL_CATALOG) {
      expect(m.note.length, `${m.id} has no note`).toBeGreaterThan(20);
    }
    expect(catalogEntry('gemini-3.5-flash')!.note).toContain('20');
    expect(catalogEntry('gemini-2.5-flash-lite')!.note).toContain('404');
  });
});
