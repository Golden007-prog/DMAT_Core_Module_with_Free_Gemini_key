import { create } from 'zustand';
import { supabase } from './supabaseClient';

export interface CloudUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AuthState {
  user: CloudUser | null;
  initializing: boolean;
  init(): void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

let initialized = false;

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  initializing: true,

  init() {
    if (initialized || !supabase) {
      set({ initializing: false });
      return;
    }
    initialized = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      set({
        initializing: false,
        user: u
          ? {
              id: u.id,
              email: u.email ?? null,
              displayName:
                (u.user_metadata?.full_name as string | undefined) ??
                (u.user_metadata?.name as string | undefined) ??
                null,
              avatarUrl: (u.user_metadata?.avatar_url as string | undefined) ?? null,
            }
          : null,
      });
    });
  },

  async signInWithGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // return to wherever the app is hosted (github.io subpath or localhost)
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
