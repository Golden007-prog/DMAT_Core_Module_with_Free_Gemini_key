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
  /** returns an error message to show, or null on success */
  signInWithEmail(email: string, password: string): Promise<string | null>;
  /** returns an error message, or null when the confirmation email was sent /
   *  the account is immediately active */
  signUpWithEmail(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}

let initialized = false;

/** dev/e2e escape hatch for the auth gate — inert in production builds */
export function authBypassed(): boolean {
  return import.meta.env.DEV && window.localStorage.getItem('coreforge-e2e-bypass') === '1';
}

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

  async signInWithEmail(email, password) {
    if (!supabase) return 'Cloud sync is not configured in this build.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return null;
    if (/email not confirmed/i.test(error.message)) {
      return 'Please confirm your email first — check your inbox for the confirmation link.';
    }
    if (/invalid login credentials/i.test(error.message)) {
      return 'Wrong email or password.';
    }
    return error.message;
  },

  async signUpWithEmail(email, password) {
    if (!supabase) return 'Cloud sync is not configured in this build.';
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      if (/already registered/i.test(error.message)) {
        return 'This email already has an account — sign in instead.';
      }
      return error.message;
    }
    // duplicate signups return an obfuscated user with no identities
    if (data.user && data.user.identities?.length === 0) {
      return 'This email already has an account — sign in instead.';
    }
    return null;
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
