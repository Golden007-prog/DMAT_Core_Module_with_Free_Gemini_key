import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { sessionStore, useSession } from '../../state/sessionStore';
import { fullCoreStore, useFullCore } from '../../state/fullCoreStore';
import { getStorage } from '../../storage/db';
import type { Difficulty, Session } from '../../engine/types';
import { formatMs, formatPercent } from '../format';
import { ruleTagLabel } from '../ruleTagLabels';
import { computeSessionPoints } from '../../state/points';
import { useAuth } from '../../cloud/authStore';
import { toast } from '../components/Toast';
import { Skeleton, SkeletonCard } from '../components/Skeleton';

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

/** celebration for ≥85% (the readiness heuristic); hidden under reduced motion */
function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0 motion-reduce:hidden">
      {Array.from({ length: 26 }, (_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 137) % 100}%`,
            background: ['#A3195B', '#F2C230', '#2C5FA8', '#3E9B4F', '#E8762C'][i % 5],
            animationDelay: `${(i % 9) * 0.12}s`,
            animationDuration: `${2 + ((i * 7) % 10) / 8}s`,
          }}
        />
      ))}
    </div>
  );
}

const STAGE_NAMES: Record<string, string> = {
  figures: 'Figure Sequences',
  equations: 'Mathematical Equations',
  latin: 'Latin Squares',
  gam: 'General Academic Module',
};

/** Per-part split for a finished staged run, plus a clearly-labeled
 *  indicative 0–200-style figure (linear practice mapping — NOT the
 *  official standardization, which cannot be derived from practice data). */
function CombinedRunSummary({ sessionIds }: { sessionIds: string[] }) {
  const [parts, setParts] = useState<Session[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getStorage().then(async (s) => {
      const loaded = await Promise.all(sessionIds.map((id) => s.getSession(id)));
      if (!cancelled) setParts(loaded.filter((x): x is Session => !!x?.score));
    });
    return () => {
      cancelled = true;
    };
  }, [sessionIds]);

  if (parts.length < 2) return null;
  const totalCorrect = parts.reduce((n, p) => n + p.score!.correct, 0);
  const totalQuestions = parts.reduce((n, p) => n + p.score!.totalQuestions, 0);
  const overall = totalQuestions === 0 ? 0 : totalCorrect / totalQuestions;
  const indicative = Math.round(overall * 200);

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-surface p-4 text-left dark:border-zinc-700 dark:bg-surface-dark-alt">
      <ul className="space-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3">
            <span className="text-zinc-600 dark:text-zinc-300">
              {STAGE_NAMES[p.subtest] ?? p.subtest}
            </span>
            <span className="font-semibold">
              {p.score!.correct}/{p.score!.totalQuestions} · {formatPercent(p.score!.accuracy)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
        Overall {totalCorrect}/{totalQuestions} ({formatPercent(overall)}) — indicative scale figure:{' '}
        <strong>{indicative} / 200</strong>
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Linear practice mapping of your accuracy onto the 0–200 range — NOT the official
        standardization, which is norm-referenced and cannot be derived from practice data.
      </p>
    </div>
  );
}

function PointsRankLink({ hasPoints }: { hasPoints: boolean }) {
  const user = useAuth((s) => s.user);
  if (!hasPoints || !user) return null;
  return (
    <Link
      to="/rankings"
      className="mt-1 text-xs font-semibold text-accent hover:underline dark:text-accent-bright"
    >
      See your weekly rank →
    </Link>
  );
}

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const active = useSession((s) => s.session);
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);
  const coreActive = useFullCore((s) => s.active);
  const coreAtBreak = useFullCore((s) => s.atBreak);
  const coreComplete = useFullCore((s) => s.complete);
  const program = useFullCore((s) => s.program);
  const nextBreakS = useFullCore((s) => s.nextBreakSeconds());
  const runSessionIds = useFullCore((s) => s.sessionIds);

  useEffect(() => {
    if (active && active.id === sessionId) {
      setSession(active);
      setLoaded(true);
    } else if (sessionId) {
      setLoaded(false);
      void getStorage()
        .then((s) => s.getSession(sessionId))
        .then((s) => {
          setSession(s ?? null);
          setLoaded(true);
        });
    } else {
      setLoaded(true);
    }
  }, [active, sessionId]);

  // full core run: register this stage's finish exactly once
  useEffect(() => {
    const core = fullCoreStore.getState();
    if (core.active && sessionId && active?.id === sessionId && !core.sessionIds.includes(sessionId)) {
      core.stageFinished(sessionId);
    }
  }, [sessionId, active]);

  if (!session?.score) {
    if (!loaded) {
      return (
        <section className="mx-auto max-w-3xl" aria-busy="true">
          <Skeleton className="h-8 w-32" />
          <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center rounded-card border border-zinc-200 bg-surface p-6 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
              <Skeleton className="h-36 w-36 rounded-full" />
              <Skeleton className="mt-3 h-3 w-40" />
            </div>
            <div className="space-y-4">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={3} />
            </div>
          </div>
        </section>
      );
    }
    return (
      <section className="py-10 text-center text-zinc-500 dark:text-zinc-400">
        <p>No finished session found here.</p>
        <Link to="/" className="mt-3 inline-block font-semibold text-accent hover:underline dark:text-accent-bright">
          Set up a practice run
        </Link>
      </section>
    );
  }

  const score = session.score;
  const points = computeSessionPoints(session);
  const slowest = session.questions
    .map((q, i) => ({ index: i, ms: session.answerTimesMs[q.id] ?? 0 }))
    .filter((t) => t.ms > 0);
  const maxTime = Math.max(1, ...slowest.map((t) => t.ms));
  const weakest = Object.entries(score.perRuleTag)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .slice(0, 3);

  const shareText = () => {
    const name =
      STAGE_NAMES[session.subtest] ?? (session.subtest === 'full-dmat' ? 'Full dMAT' : 'Core Module');
    return `dMAT practice — ${name} (${session.difficulty}, ${session.questionCount} questions): ${formatPercent(score.accuracy)} accuracy, +${points.total} pts. Train free: https://golden007-prog.github.io/DMAT_Core_Module_with_Free_Gemini_key/`;
  };

  return (
    <section className="mx-auto max-w-3xl">
      {score.accuracy >= 0.85 && <Confetti />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Results</h1>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(shareText()).then(
              () => toast('Result copied — paste it anywhere.', 'success'),
              () => toast('Could not copy on this browser.', 'error'),
            );
          }}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Share result
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center rounded-card border border-zinc-200 bg-surface p-6 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <ScoreRing accuracy={score.accuracy} />
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {score.correct} correct · {score.wrong - score.unanswered} wrong · {score.unanswered} unanswered
          </p>
          {points.total > 0 && (
            <p className="mt-2 rounded-full bg-accent-tint px-3 py-1 text-sm font-semibold text-accent dark:bg-accent/15 dark:text-accent-bright">
              +{points.total} pts
              {points.timeBonus > 0 && (
                <span className="font-normal"> ({points.base} + {points.timeBonus} time bonus)</span>
              )}
            </p>
          )}
          <PointsRankLink hasPoints={points.total > 0} />
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

      {slowest.length > 0 && (
        <div className="mt-4 rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Time per question</h2>
          <div className="mt-2 space-y-1.5">
            {slowest.map((t) => (
              <div key={t.index} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-right tabular-nums text-zinc-500">Q{t.index + 1}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-r ${t.ms > 75_000 ? 'bg-warning' : 'bg-accent dark:bg-accent-dark'}`}
                    style={{ width: `${(t.ms / maxTime) * 100}%` }}
                  />
                </div>
                <span className={`w-12 text-right tabular-nums ${t.ms > 75_000 ? 'font-semibold text-warning' : 'text-zinc-500'}`}>
                  {Math.round(t.ms / 1000)}s
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">Amber = over the 75 s exam budget.</p>
        </div>
      )}

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

      {coreActive && coreAtBreak && (
        <div className="mt-4 rounded-card border-2 border-accent/40 bg-accent-tint/50 p-5 dark:border-accent-dark/40 dark:bg-accent/10">
          <p className="font-semibold">
            {program === 'full-dmat' ? 'Full dMAT simulation in progress.' : 'Full Core Module run in progress.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/break')}
            className="mt-3 rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover"
          >
            {nextBreakS >= 600
              ? 'Take the 30-minute module break → General Academic Module'
              : 'Take the 60 s break → next subtest'}
          </button>
        </div>
      )}
      {coreActive && coreComplete && (
        <div className="mt-4 rounded-card border border-success/40 bg-success/5 p-5">
          <p className="font-semibold text-success">
            {program === 'full-dmat'
              ? 'Full dMAT simulation complete — Core Module and General Academic Module done.'
              : 'Full Core Module run complete — all three subtests done.'}
          </p>
          <CombinedRunSummary sessionIds={runSessionIds} />
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Find each part's result in your History for review.
          </p>
          <button
            type="button"
            onClick={() => fullCoreStore.getState().reset()}
            className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Done
          </button>
        </div>
      )}

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
