import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Verified against ai.google.dev at build time (July 2026). Users can
 *  override in Settings; startup model discovery marks what actually exists
 *  for their key. Never a Pro model — free-tier quotas assume scarcity. */
export const DEFAULT_MODEL_CHAIN = ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

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
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    // explicit window.localStorage: Node's experimental localStorage global
    // must never shadow the browser one (also breaks vitest+jsdom otherwise)
    { name: 'coreforge-settings', storage: createJSONStorage(() => window.localStorage) },
  ),
);
