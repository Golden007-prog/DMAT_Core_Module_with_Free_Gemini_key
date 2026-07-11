/** What each Gemini model actually does on a *free* key, measured 2026-07-11 with
 *  live calls (thinkingBudget: 0, one small call and the app's 20-system batch).
 *  Nothing here is copied from marketing pages — the docs do not mention that the
 *  two newest Flash models die after twenty requests a day, and that one fact
 *  decides the entire chain order.
 *
 *  The registry exists because HTTP status alone cannot classify Google's 429: a
 *  billing-walled model and an exhausted free model return the identical
 *  RESOURCE_EXHAUSTED. Only `tier` separates "enable billing" from "come back
 *  tomorrow", and only `freeRequestsPerDay` says whether a backoff could ever
 *  help. gemini.ts branches on this table, never on the status alone.
 *
 *  Invariant: this file is the ONE source of truth for model IDs. The default
 *  chain, the retired list, the Settings picker and the 429 classifier are all
 *  derived from it — a second string list is how the app shipped a lead model
 *  that never existed. */

export type ModelGeneration = '3.x' | '2.5' | '2.0' | 'legacy';

/** Which quota bucket the model draws on. `billing` means a free key gets 429
 *  RESOURCE_EXHAUSTED on the FIRST call — a wall, not a bucket that refills. */
export type ModelTier = 'free' | 'billing';

/** What the model can emit. Only `text` can serve this app: every AI feature here
 *  is text-in / JSON-out. */
export type ModelCapability = 'text' | 'live-audio' | 'image';

export type ModelStatus =
  /** free, fast, no observed daily cap — safe to lead a chain */
  | 'recommended'
  /** free and works, but with a caveat that keeps it out of the default chain */
  | 'usable'
  /** free but with a hard daily request ceiling; see freeRequestsPerDay */
  | 'capped'
  /** 404s for a current key — never offer it, and strip it from persisted chains */
  | 'retired'
  /** exists, but 429s on any free key until billing is enabled */
  | 'needs-billing'
  /** real and reachable, but cannot do text-in/JSON-out at all */
  | 'wrong-capability';

export interface ModelEntry {
  id: string;
  label: string;
  generation: ModelGeneration;
  tier: ModelTier;
  capability: ModelCapability;
  status: ModelStatus;
  /** Measured free-tier ceiling. Present ONLY where a live 429 stated it, and it
   *  is the most decision-relevant number in the file: at 20/day a chain led by
   *  this model gives about one practice session before the AI dies. Absent means
   *  no cap was observed, not that none exists. */
  freeRequestsPerDay?: number;
  /** Measured behaviour — latency, the verbatim 404 text, the 429 limit. */
  note: string;
}

/** Order matters: the free text models appear in preference order, and
 *  RECOMMENDED_PREFERENCE is derived from it. */
export const MODEL_CATALOG: readonly ModelEntry[] = [
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    generation: '3.x',
    tier: 'free',
    capability: 'text',
    status: 'recommended',
    note: '837 ms single call, 4.7 s on the 20-system batch, and still answering after ~50 calls in one day — no daily cap surfaced. The only model that survives a real practice day, so it leads the chain.',
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash (preview)',
    generation: '3.x',
    tier: 'free',
    capability: 'text',
    status: 'capped',
    freeRequestsPerDay: 20,
    note: '1402 ms single call, 4.9 s on the batch — but the 21st request of the day returns 429 RESOURCE_EXHAUSTED, "limit: 20". Quality escalation only, never the lead. Its display name is "Gemini 3 Flash"; the bare id gemini-3-flash does not exist.',
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    generation: '3.x',
    tier: 'free',
    capability: 'text',
    status: 'capped',
    freeRequestsPerDay: 20,
    note: 'Best answers, worst economics: 10.6 s single call and 16.6 s on the batch (12x slower than 3.1-flash-lite), and 429 RESOURCE_EXHAUSTED "limit: 20" per day. Leading a chain with it spends the whole day on one session.',
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    generation: '2.5',
    tier: 'free',
    capability: 'text',
    status: 'usable',
    note: '1242 ms single call, 7.8 s on the batch, no daily cap observed — but it thinks by default and was the one model that still came back finishReason=MAX_TOKENS on a full batch. Safe only because gemini.ts pins thinkingBudget: 0. Kept as a manual fallback, not in the default chain.',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    generation: '2.5',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: '404: "no longer available to new users". Dead for any recently created key, so a chain holding it wastes a round-trip on every AI call.',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    generation: '2.5',
    tier: 'billing',
    capability: 'text',
    status: 'needs-billing',
    note: '429 RESOURCE_EXHAUSTED on the first call with a free key — effectively billing-walled. Identical status to an exhausted free quota, which is precisely why `tier` exists.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro (preview)',
    generation: '3.x',
    tier: 'billing',
    capability: 'text',
    status: 'needs-billing',
    note: '429 RESOURCE_EXHAUSTED on a free key. Retrying it is a wall, not a queue.',
  },
  {
    id: 'gemini-omni-flash-preview',
    label: 'Gemini Omni Flash (preview)',
    generation: '3.x',
    tier: 'billing',
    capability: 'text',
    status: 'needs-billing',
    note: '429 RESOURCE_EXHAUSTED on a free key.',
  },
  {
    id: 'gemini-3-pro-image',
    label: 'Gemini 3 Pro Image',
    generation: '3.x',
    tier: 'billing',
    capability: 'image',
    status: 'needs-billing',
    note: '429 RESOURCE_EXHAUSTED on a free key, and image-out anyway — this app is text-in/JSON-out.',
  },
  {
    id: 'gemini-3.1-flash-image',
    label: 'Gemini 3.1 Flash Image',
    generation: '3.x',
    tier: 'billing',
    capability: 'image',
    status: 'needs-billing',
    note: '429 RESOURCE_EXHAUSTED on a free key, and image-out anyway.',
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: 'Gemini 3.1 Flash Lite Image',
    generation: '3.x',
    tier: 'billing',
    capability: 'image',
    status: 'needs-billing',
    note: '429 RESOURCE_EXHAUSTED on a free key, and image-out anyway.',
  },
  {
    id: 'gemini-3.5-live-translate-preview',
    label: 'Gemini 3.5 Live Translate (preview)',
    generation: '3.x',
    tier: 'free',
    capability: 'live-audio',
    status: 'wrong-capability',
    note: 'supportedGenerationMethods = ["bidiGenerateContent"] only: it 404s on generateContent. The Live WebSocket handshake does open on a free key, so the model is real — it is speech-audio in/out and cannot generate text, which makes it useless for a non-verbal exam trainer. Catalogued so nobody re-discovers it; never wired in.',
  },
  {
    id: 'gemini-3-flash',
    label: 'Gemini 3 Flash (id does not exist)',
    generation: '3.x',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: '404 — this id NEVER existed. It is only the display name of gemini-3-flash-preview, and it led the v0 default chain, which is how every AI call started with a guaranteed-dead round-trip.',
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    generation: '2.0',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: '429 quota-exhausted on a free key with no usable allowance left — treated as retired so it never reaches a chain.',
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash (moving alias)',
    generation: '3.x',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: 'Resolves to whatever Google points it at today, and on 2026-07-11 that was a thinking-heavy model that truncated the batch on MAX_TOKENS. A moving target cannot be a measured entry, so it is not offered.',
  },
  // Never measured on 2026-07-11 — they predate the key. Kept as retired entries
  // for one reason: repairModelChain strips them out of chains persisted by older
  // builds, and the repair needs the id to be *known*, not merely absent.
  {
    id: 'gemini-3.0-flash',
    label: 'Gemini 3.0 Flash (id does not exist)',
    generation: '3.x',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: 'Not a real id — a plausible-looking typo for gemini-3-flash-preview. Listed so a persisted chain containing it gets repaired instead of 404ing.',
  },
  {
    id: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    generation: 'legacy',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: 'The 1.5 line is no longer served to new keys. Not re-measured; kept so old persisted chains are repaired.',
  },
  {
    id: 'gemini-1.5-flash-latest',
    label: 'Gemini 1.5 Flash (alias)',
    generation: 'legacy',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: 'The 1.5 line is no longer served to new keys. Not re-measured; kept so old persisted chains are repaired.',
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    generation: 'legacy',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: 'The 1.5 line is no longer served to new keys. Not re-measured; kept so old persisted chains are repaired.',
  },
  {
    id: 'gemini-pro',
    label: 'Gemini Pro (legacy alias)',
    generation: 'legacy',
    tier: 'free',
    capability: 'text',
    status: 'retired',
    note: 'Legacy alias from the PaLM-era API. Not re-measured; kept so old persisted chains are repaired.',
  },
];

const BY_ID: ReadonlyMap<string, ModelEntry> = new Map(MODEL_CATALOG.map((m) => [m.id, m]));

export function catalogEntry(id: string): ModelEntry | undefined {
  return BY_ID.get(id);
}

/** A 429 from one of these is a wall, not a bucket: no backoff and no midnight
 *  reset will get past it, so gemini.ts must fail fast and say "enable billing". */
export function isBillingOnly(id: string): boolean {
  return BY_ID.get(id)?.tier === 'billing';
}

/** 404s for a current key — never offer it, and strip it from persisted chains. */
export function isRetired(id: string): boolean {
  return BY_ID.get(id)?.status === 'retired';
}

/** The measured daily ceiling, or undefined when none was observed. Its presence
 *  is what tells the retry loop that sleeping 1s/2s/4s cannot possibly help. */
export function freeRequestCap(id: string): number | undefined {
  return BY_ID.get(id)?.freeRequestsPerDay;
}

export const RETIRED_MODEL_IDS: ReadonlySet<string> = new Set(
  MODEL_CATALOG.filter((m) => m.status === 'retired').map((m) => m.id),
);

/** High-volume first, quality last — the opposite of the order this app shipped.
 *  gemini-3.1-flash-lite has no observed cap and answers in <1 s; the other two
 *  are hard-capped at 20 requests/day, so they can only ever be escalation steps.
 *  Leading with gemini-3.5-flash (the old default) burned a free-tier user's
 *  entire day on roughly one practice session. */
export const RECOMMENDED_CHAIN: readonly string[] = [
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
];

/** Everything a free key may legitimately put in a chain: text-out, alive, free. */
export const SELECTABLE_MODELS: readonly ModelEntry[] = MODEL_CATALOG.filter(
  (m) =>
    m.capability === 'text' &&
    m.tier === 'free' &&
    m.status !== 'retired' &&
    m.status !== 'wrong-capability',
);

/** Rows the Settings picker renders. Billing models are shown but disabled — a
 *  greyed row with a reason answers "why can't I use Pro?" once; hiding them
 *  invites the user to type the id into a chain by hand. Image and live-audio
 *  models are not offered at all: they cannot answer a JSON prompt. */
export const PICKER_MODELS: readonly ModelEntry[] = MODEL_CATALOG.filter(
  (m) => m.capability === 'text' && m.status !== 'retired',
);

/** Repair order for "use the recommended chain": the live model list is filtered
 *  through this and the survivors become the chain. Derived, never hand-listed. */
export const RECOMMENDED_PREFERENCE: readonly string[] = [
  ...RECOMMENDED_CHAIN,
  ...SELECTABLE_MODELS.map((m) => m.id).filter((id) => !RECOMMENDED_CHAIN.includes(id)),
];
