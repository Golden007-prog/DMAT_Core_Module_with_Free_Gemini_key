import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../cloud/authStore';
import { cloudEnabled } from '../../cloud/supabaseClient';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

const FEATURES = [
  {
    title: 'All three Core Module subtests',
    body: 'Figure Sequences, Mathematical Equations, and Latin Squares in the official format — 20 tasks in 25:00, single choice, no note-taking.',
  },
  {
    title: 'Unlimited validated questions',
    body: 'Every task is freshly generated and machine-proven: exactly one correct answer, plausible distractors, solvable under the official rule system.',
  },
  {
    title: 'Explanations that teach',
    body: 'Step-by-step solutions, rule breakdowns, and animated sequence replays — plus analytics that show exactly which rule types cost you points.',
  },
  {
    title: 'Your progress everywhere',
    body: 'History, settings, and generated sets sync to your account. Practice on the laptop, review on the phone.',
  },
];

/** Public landing: the only screen visible signed-out. Everything else
 *  requires an account (owner-scoped cloud sync needs an identity). */
export default function Landing() {
  const { user, initializing, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        const err = await signInWithEmail(email.trim(), password);
        if (err) setError(err);
      } else {
        const err = await signUpWithEmail(email.trim(), password);
        if (err) setError(err);
        else {
          setNotice('Account created. Check your inbox and click the confirmation link, then sign in.');
          setMode('signin');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <section className="grid items-center gap-8 py-6 sm:gap-10 sm:py-8 lg:grid-cols-[1.2fr_1fr] lg:py-14">
        <div className="order-2 lg:order-1">
          <p className="text-sm font-semibold tracking-wide text-accent uppercase dark:text-accent-dark">
            Free dMAT Core Module practice
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
            Train for the digitaler Mastertest with unlimited, exam-faithful questions.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-300">
            CoreForge simulates the dMAT Core Module — the aptitude test for admission to German
            Master's programmes — with real exam timing, honest scoring, and analytics that tell
            you exactly what to drill next.
          </p>
          <ul className="mt-6 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span aria-hidden="true" className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-tint text-xs font-bold text-accent dark:bg-accent/20 dark:text-accent-dark">
                  ✓
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 rounded-card border border-zinc-200 bg-surface p-6 shadow-card-lift lg:order-2 dark:border-zinc-800 dark:bg-surface-dark-alt">
          <h2 className="text-lg font-bold">{mode === 'signin' ? 'Sign in' : 'Create your free account'}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Free forever — your practice history stays yours.
          </p>

          {cloudEnabled ? (
            <>
              <button
                type="button"
                disabled={initializing || busy}
                onClick={() => void signInWithGoogle()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 font-semibold hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="my-4 flex items-center gap-3 text-xs text-zinc-400" aria-hidden="true">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                or with email
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Password</span>
                  <input
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    required
                  />
                </label>

                {error && (
                  <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                    {notice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {mode === 'signin' ? (
                  <>
                    New here?{' '}
                    <button type="button" onClick={() => { setMode('signup'); setError(null); }} className="font-semibold text-accent hover:underline dark:text-accent-dark">
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{' '}
                    <button type="button" onClick={() => { setMode('signin'); setError(null); }} className="font-semibold text-accent hover:underline dark:text-accent-dark">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              This build has no cloud configuration, so no sign-in is required — reload to enter
              the app directly.
            </p>
          )}
        </div>
      </section>

      <p className="pb-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
        Not affiliated with g.a.s.t., TestDaF-Institut, or d-mat.de. All questions are originally
        generated. Official example tasks:{' '}
        <a href="https://www.d-mat.de" target="_blank" rel="noreferrer" className="underline">
          d-mat.de
        </a>
      </p>
    </div>
  );
}
