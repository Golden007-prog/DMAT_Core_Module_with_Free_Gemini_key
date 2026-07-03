import { useState } from 'react';
import { cloudEnabled } from '../../cloud/supabaseClient';
import { useAuth } from '../../cloud/authStore';
import { fullSync } from '../../cloud/sync';
import { toast } from './Toast';

/** Settings card: Google sign-in + cross-device sync status. Hidden when the
 *  build has no Supabase key — the app is fully usable without an account. */
export default function AccountCard() {
  const { user, initializing, signInWithGoogle, signOut } = useAuth();
  const [syncing, setSyncing] = useState(false);

  if (!cloudEnabled) {
    return (
      <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <h2 className="font-semibold">Account & sync</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Cloud sync is not configured in this build. Everything is stored in this browser; use
          Export/Import below to move your history between devices.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
      <h2 className="font-semibold">Account & sync</h2>
      {user ? (
        <>
          <div className="mt-3 flex items-center gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">
                {(user.displayName ?? user.email ?? '?')[0]?.toUpperCase()}
              </span>
            )}
            <div>
              <p className="font-medium">{user.displayName ?? 'Signed in'}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            Finished sessions, settings, and generated sets sync to your account automatically —
            your history follows you across devices. Your Gemini key never leaves this device.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                try {
                  await fullSync();
                  toast('Sync complete.', 'success');
                } catch {
                  toast('Sync failed — will retry automatically later.', 'error');
                } finally {
                  setSyncing(false);
                }
              }}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Sign in to back up your history and settings and continue on any device. Optional — the
            app works fully without an account.
          </p>
          <button
            type="button"
            disabled={initializing}
            onClick={() => void signInWithGoogle()}
            className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Sign in with Google
          </button>
        </>
      )}
    </div>
  );
}
