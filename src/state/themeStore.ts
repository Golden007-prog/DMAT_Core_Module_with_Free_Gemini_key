import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      // the toolbar button cycles between explicit light/dark (system stays a
      // Settings choice); it flips relative to what is currently shown
      toggle: () =>
        set((s) => {
          const showingDark = s.theme === 'dark' || (s.theme === 'system' && systemPrefersDark());
          return { theme: showingDark ? 'light' : 'dark' };
        }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'coreforge-theme', storage: createJSONStorage(() => window.localStorage) },
  ),
);

export function resolvedTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme;
}

export function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', resolvedTheme(theme) === 'dark');
}

/** keeps 'system' mode live when the OS theme changes */
export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mq?.addEventListener) return () => {};
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
