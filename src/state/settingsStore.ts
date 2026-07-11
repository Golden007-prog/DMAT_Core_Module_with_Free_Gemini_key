import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Every entry ran against a real free-tier key on 2026-07-11 — on the app's own
 *  20-system batch, with thinking disabled (gemini.ts pins thinkingBudget: 0),
 *  all three returned 20/20 valid systems: 3.5-flash 16.6 s, 3-flash-preview
 *  4.9 s, 3.1-flash-lite 4.7 s. Frontier quality leads; the two fast survivors
 *  sit behind it, so a slow or throttled lead costs seconds, not the feature.
 *  Never a Pro model: free-tier quotas assume scarcity. Users can override in
 *  Settings; the key test marks what actually exists for their key. */
export const DEFAULT_MODEL_CHAIN = [
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
];

/** Preference order for Settings' "use recommended chain" repair: the live model
 *  list is filtered through this and the first three survivors become the chain.
 *  The three verified-alive models lead; gemini-2.5-flash is a fallback only —
 *  it exists, but it thinks hardest by default and was the one model that still
 *  came back MAX_TOKENS on a full batch. */
export const RECOMMENDED_MODEL_PREFERENCE = [
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

/** IDs a current free key cannot use. Verified 2026-07-11 against ListModels and
 *  live generateContent calls: "gemini-3-flash" never existed (it is only the
 *  display name of gemini-3-flash-preview); gemini-2.5-flash-lite now 404s with
 *  "no longer available to new users"; gemini-2.0-flash answers 429 quota-
 *  exceeded on the free tier; gemini-flash-latest resolves to a thinking-heavy
 *  model that truncates a batch on MAX_TOKENS. Persisted chains are repaired
 *  once, on migration. */
export const RETIRED_MODEL_IDS: ReadonlySet<string> = new Set([
  'gemini-3-flash',
  'gemini-3.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-pro',
]);

/** Chains we shipped as *defaults*: holding one is not evidence of a user choice,
 *  so each is replaced wholesale by the current default. v0 led with a model ID
 *  that never existed; v1's lead worked but its tail ended in gemini-2.5-flash-
 *  lite, which is now dead to any recently created key. */
const SHIPPED_DEFAULT_CHAINS: readonly string[][] = [
  ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], // v0
  ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'], // v1
];

const sameChain = (a: string[], b: readonly string[]) =>
  a.length === b.length && a.every((m, i) => m === b[i]);

function repairModelChain(chain: unknown): string[] {
  const ids = Array.isArray(chain) ? chain.filter((m): m is string => typeof m === 'string') : [];
  if (ids.length === 0) return DEFAULT_MODEL_CHAIN;
  if (SHIPPED_DEFAULT_CHAINS.some((shipped) => sameChain(ids, shipped))) return DEFAULT_MODEL_CHAIN;
  // a deliberately customised chain keeps its still-valid entries
  const kept = ids.filter((m) => !RETIRED_MODEL_IDS.has(m));
  return kept.length > 0 ? kept : DEFAULT_MODEL_CHAIN;
}

export const DEFAULT_AI_DAILY_BUDGET = 25;

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
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    // explicit window.localStorage: Node's experimental localStorage global
    // must never shadow the browser one (also breaks vitest+jsdom otherwise)
    {
      name: 'coreforge-settings',
      storage: createJSONStorage(() => window.localStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState>;
        // v0/v1 → v2: both shipped a chain a free key cannot finish — v0 led with
        // a model ID that never existed, v1 trailed into a model that is now dead
        // to new keys. Only modelChain is touched; geminiKey and every other
        // setting are carried across untouched.
        //
        // `!== 2`, not `< 2`: zustand only calls migrate when the stored version
        // differs from the current one, so every value that reaches here needs
        // repairing — including `undefined`, which a blob written without a
        // version field yields and which `undefined < 2` silently answers false
        // to (NaN comparison), waving the dead chain straight through.
        if (version !== 2) {
          return { ...state, modelChain: repairModelChain(state.modelChain) } as SettingsState;
        }
        return state as SettingsState;
      },
    },
  ),
);
