import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  RECOMMENDED_CHAIN,
  RECOMMENDED_PREFERENCE,
  RETIRED_MODEL_IDS as CATALOG_RETIRED_MODEL_IDS,
} from '../ai/modelCatalog';

/** High-volume model first, quality last. Measured 2026-07-11 on a real free key:
 *  gemini-3.5-flash and gemini-3-flash-preview both answer 429 RESOURCE_EXHAUSTED
 *  with "limit: 20" — twenty requests PER DAY — while gemini-3.1-flash-lite was
 *  still answering after ~50 calls, in 837 ms, against 10.6 s for 3.5-flash. The
 *  old chain led with 3.5-flash, so a free-tier user got roughly ONE practice
 *  session before the AI died for the day. Quality now escalates behind volume:
 *  the capped models are still reachable, they just no longer spend the day's
 *  entire allowance on the first call. Derived from the catalogue — one source of
 *  truth for every model ID in the app. */
export const DEFAULT_MODEL_CHAIN: string[] = [...RECOMMENDED_CHAIN];

/** Preference order for Settings' "use the recommended chain" repair: the live
 *  model list is filtered through this and the survivors become the chain. */
export const RECOMMENDED_MODEL_PREFERENCE: string[] = [...RECOMMENDED_PREFERENCE];

/** IDs a current key cannot use (404 / dead alias / never existed). Derived from
 *  the catalogue, not duplicated here — a second list is exactly how a lead model
 *  that never existed survived two releases. Persisted chains are repaired on
 *  migration. */
export const RETIRED_MODEL_IDS: ReadonlySet<string> = CATALOG_RETIRED_MODEL_IDS;

/** Chains we shipped as *defaults*: holding one is not evidence of a user choice,
 *  so each is replaced wholesale by the current default. v0 led with a model ID
 *  that never existed; v1's tail ended in gemini-2.5-flash-lite, now dead to any
 *  recent key; v2's entries all work but its order was backwards — it led with a
 *  20-requests-per-day model. */
const SHIPPED_DEFAULT_CHAINS: readonly string[][] = [
  ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], // v0
  ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], // v1
  ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'], // v2
];

const sameChain = (a: string[], b: readonly string[]) =>
  a.length === b.length && a.every((m, i) => m === b[i]);

/** A chain must always have somewhere USABLE to go. Two ways it can fail to:
 *  it is empty (the old Settings text field wrote `[]` the moment the user
 *  selected-all and deleted, and generateJson then fails before it sends a single
 *  request), or every entry in it 404s. Both are rejected wherever a chain is
 *  written, not in the UI, so no future control can reintroduce the bug.
 *
 *  A billing-only model is deliberately KEPT: it is a wall only for keys without
 *  billing, and gemini.ts now walks past it to the next model instead of dying on
 *  it. Filtering it out here would silently rewrite the chain of every user who
 *  actually pays. */
function usableChain(chain: unknown): string[] | null {
  const ids = Array.isArray(chain) ? chain.filter((m): m is string => typeof m === 'string') : [];
  const kept = ids.filter((m) => !RETIRED_MODEL_IDS.has(m));
  return kept.length > 0 ? kept : null;
}

/**
 * The full repair, for chains that arrive from STORAGE rather than from a click:
 * an old persisted blob, a cloud row written by a device on an older build. On
 * top of the validity repair it replaces a chain that is exactly one of our own
 * shipped defaults, because holding one is not evidence of a user's choice — and
 * all three were measured broken (v0 led with an ID that never existed, v1 trailed
 * into a model now dead to new keys, v2 led with a model capped at 20 requests a
 * day, which is about one practice session).
 *
 * It is NOT applied to a UI write: there, an identical sequence IS a user's
 * choice, and snapping it back under their cursor would be a bug. Ingest boundaries
 * (migrate, merge, cloud pull) call this; `set` calls usableChain.
 */
export function repairModelChain(chain: unknown): string[] {
  const ids = Array.isArray(chain) ? chain.filter((m): m is string => typeof m === 'string') : [];
  if (SHIPPED_DEFAULT_CHAINS.some((shipped) => sameChain(ids, shipped))) return DEFAULT_MODEL_CHAIN;
  return usableChain(ids) ?? DEFAULT_MODEL_CHAIN;
}

/** 60, not 20. The old 20 was pinned to the tightest ceiling in the chain — but
 *  that ceiling belongs to gemini-3.5-flash and gemini-3-flash-preview, the two
 *  models the chain now DEMOTES to escalation-only and a healthy user therefore
 *  never calls. Binding the global budget to a fallback's cap throttled the lead's
 *  headroom: gemini-3.1-flash-lite served 50+ calls in a measured day with no cap
 *  surfaced, so a keen day (8 AI sets + 12 explanations + 4 coach refreshes = 24
 *  calls) hit the APP's wall by mid-afternoon while Google's was nowhere in sight.
 *  The capped models are now guarded individually, against their own catalogue cap
 *  (aiUsage.getModelUsageToday), which is the only guard that can be right for
 *  models with different ceilings. This number is what is left: a runaway-loop
 *  backstop, not a throttle. The field goes to 200. */
export const DEFAULT_AI_DAILY_BUDGET = 60;

interface SettingsState {
  equationAskMode: 'choice' | 'entry';
  /** exam navigation: linear forward-only (default) or free — labelled
   *  honestly in the UI: "Official behaviour unconfirmed" */
  examNavFree: boolean;
  instantFeedback: boolean;
  hideTimer: boolean;
  geminiKey: string;
  modelChain: string[];
  aiDailyBudget: number;
  aiEquationsEnabled: boolean;
  /** latin squares display alphabet ('random' varies per question) */
  latinAlphabet: 'letters' | 'digits' | 'greek' | 'shapes' | 'random';
  /** answer feedback sounds (WebAudio, off by default) */
  soundEffects: boolean;
  /** vibration on answer commit (mobile devices) */
  haptics: boolean;
  /** practice: jump to the next question automatically after answering */
  autoAdvance: boolean;
  /** distraction-free runner: hides progress bar and palette */
  focusMode: boolean;
  /** daily practice goal in questions (0 = off) */
  dailyGoal: number;
  /** question content size */
  questionScale: 'compact' | 'comfortable' | 'large';

  set<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      equationAskMode: 'choice',
      examNavFree: false,
      instantFeedback: true,
      hideTimer: false,
      geminiKey: '',
      modelChain: DEFAULT_MODEL_CHAIN,
      aiDailyBudget: DEFAULT_AI_DAILY_BUDGET,
      aiEquationsEnabled: false,
      latinAlphabet: 'letters',
      soundEffects: false,
      haptics: true,
      autoAdvance: false,
      focusMode: false,
      dailyGoal: 20,
      questionScale: 'comfortable',
      set: (key, value) => {
        // the one setting that can brick the AI by being *valid but useless* — []
        // makes every call fail before a request goes out, and a chain of retired
        // IDs spends a guaranteed 404 per model on every call
        if (key === 'modelChain') {
          const chain = usableChain(value);
          if (!chain) return; // reject: keep the chain in force rather than store a dead one
          set({ modelChain: chain });
          return;
        }
        set({ [key]: value } as Partial<SettingsState>);
      },
    }),
    // explicit window.localStorage: Node's experimental localStorage global
    // must never shadow the browser one (also breaks vitest+jsdom otherwise)
    {
      name: 'coreforge-settings',
      storage: createJSONStorage(() => window.localStorage),
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState>;
        // v0/v1/v2 → v3: every shipped default so far cost the user something. v0
        // led with a model ID that never existed; v1 trailed into a model now dead
        // to new keys; v2's order was backwards — it led with a model capped at 20
        // requests/day, which is about one practice session. Only modelChain is
        // touched; geminiKey and every other setting are carried across untouched.
        //
        // `!== 3`, not `< 3`, so that a garbage version cannot read as "already
        // current" via a NaN comparison. But do not mistake this for the guard on a
        // VERSIONLESS blob: zustand gates this whole branch on
        // `typeof version === 'number'` (middleware.js), so a blob with no version
        // — or a string one — never reaches migrate at all. `merge` is what covers
        // those, and it runs on every load.
        if (version !== 3) {
          return { ...state, modelChain: repairModelChain(state.modelChain) } as SettingsState;
        }
        return state as SettingsState;
      },
      // The one hook zustand runs on EVERY rehydrate, whatever the stored version
      // says — and therefore the only one that sees a blob with no version field, a
      // blob with a string version, and a dead chain already persisted at the
      // current version (which migrate, by definition, will never be called for).
      // The full repair lives here for exactly that reason.
      merge: (persisted, current) => {
        const state = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...state,
          modelChain: repairModelChain(state.modelChain),
        };
      },
    },
  ),
);
