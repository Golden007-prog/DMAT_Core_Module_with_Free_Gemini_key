import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { sessionStore, useSession } from '../../state/sessionStore';
import { getStorage } from '../../storage/db';
import type { Difficulty, Session } from '../../engine/types';
import { formatMs, formatPercent } from '../format';
import { ruleTagLabel } from '../ruleTagLabels';

function ScoreRing({ accuracy }: { accuracy: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const good = accuracy >= 0.85;
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label={`Accuracy ${formatPercent(accuracy)}`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-200 dark:text-zinc-800" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={good ? '#2E8B57' : '#A3195B'}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${accuracy * c} ${c}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="66" textAnchor="middle" className="fill-current" fontSize="24" fontWeight="700">
        {formatPercent(accuracy)}
      </text>
    </svg>
  );
}

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const active = useSession((s) => s.session);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (active && active.id === sessionId) {
      setSession(active);
    } else if (sessionId) {
      void getStorage()
        .then((s) => s.getSession(sessionId))
        .then((s) => setSession(s ?? null));
    }
  }, [active, sessionId]);

  if (!session?.score) {
    return (
      <section className="py-10 text-center text-zinc-500 dark:text-zinc-400">
        <p>No finished session found here.</p>
        <Link to="/" className="mt-3 inline-block font-semibold text-accent hover:underline dark:text-accent-dark">
          Set up a practice run
        </Link>
      </section>
    );
  }

  const score = session.score;
  const weakest = Object.entries(score.perRuleTag)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .slice(0, 3);

  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Results</h1>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center rounded-card border border-zinc-200 bg-surface p-6 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <ScoreRing accuracy={score.accuracy} />
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {score.correct} correct · {score.wrong - score.unanswered} wrong · {score.unanswered} unanswered
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Pacing</h2>
            <p className="mt-1 text-lg font-semibold">
              {formatMs(score.totalTimeMs)} total ·{' '}
              {score.avgTimePerQuestionMs > 0 ? `${Math.round(score.avgTimePerQuestionMs / 1000)} s / question` : 'no timing data'}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">The real exam budget is 75 s per task.</p>
          </div>

          <div className="rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">By difficulty</h2>
            <div className="mt-2 space-y-2">
              {DIFFS.filter((d) => score.perDifficulty[d]).map((d) => {
                const v = score.perDifficulty[d]!;
                return (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-16 text-sm capitalize">{d}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div className="h-full rounded-full bg-accent dark:bg-accent-dark" style={{ width: `${(v.correct / v.total) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm tabular-nums">
                      {v.correct}/{v.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {weakest.length > 0 && (
        <div className="mt-4 rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Weakest rule types in this set</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {weakest.map(([tag, v]) => (
              <li key={tag} className="flex justify-between gap-4">
                <span>{ruleTagLabel(tag)}</span>
                <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                  {v.correct}/{v.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 rounded-card border border-zinc-200 bg-surface p-5 text-sm shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        {score.accuracy >= 0.85 ? (
          <p>
            <strong>On track.</strong> You cleared the 85% readiness target — an app heuristic, not an official
            threshold.
          </p>
        ) : (
          <p>
            <strong>Keep drilling.</strong> Aim for ≥ 85% accuracy — an app heuristic for exam readiness, not an
            official threshold.
          </p>
        )}
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          The real dMAT reports a standardised 0–200 score (mean 100) that cannot be derived from practice
          accuracy.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to={`/review/${session.id}`}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover"
        >
          Review answers
        </Link>
        <button
          type="button"
          onClick={() => {
            void sessionStore.getState().restart();
            navigate('/run');
          }}
          className="rounded-lg border border-zinc-200 px-5 py-2.5 font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          New set (same settings)
        </button>
        <Link
          to="/"
          className="rounded-lg px-5 py-2.5 font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Home
        </Link>
      </div>
    </section>
  );
}
