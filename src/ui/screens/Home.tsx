import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sessionStore, useSession } from '../../state/sessionStore';
import { fullCoreStore } from '../../state/fullCoreStore';
import { useHistory } from '../../state/historyStore';
import { useSettings } from '../../state/settingsStore';
import type { Difficulty, SubtestType } from '../../engine/types';
import { LATIN_ALPHABETS, ALPHABET_IDS } from '../../engine/latinSquares/alphabets';
import { formatPercent, formatMs } from '../format';
import ConfirmDialog from '../components/ConfirmDialog';
import { nextIndiaTestDate } from '../../content/gamInfo';

/** Days until the next official India test date; null once it has passed. */
function daysToIndiaTest(): number | null {
  const days = Math.ceil((nextIndiaTestDate().getTime() - Date.now()) / 86_400_000);
  return days >= 0 ? days : null;
}

const SUBTESTS: Array<{
  key: SubtestType;
  name: string;
  description: string;
  icon: string;
}> = [
  {
    key: 'figures',
    name: 'Figure Sequences',
    description: 'Spot how symbols move, rotate and change colour across four matrices — then predict the 5th and 6th.',
    icon: '▲',
  },
  {
    key: 'equations',
    name: 'Mathematical Equations',
    description: 'Small systems of equations with whole-number solutions from 1 to 20. Find the values mentally.',
    icon: '×',
  },
  {
    key: 'latin',
    name: 'Latin Squares',
    description: 'A 5×5 grid where each letter appears once per row and column. Deduce the letter behind the red "?".',
    icon: '?',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const history = useHistory();
  const settings = useSettings();
  const [subtest, setSubtest] = useState<SubtestType>('figures');
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('medium');
  const [count, setCount] = useState<3 | 5 | 10 | 20>(10);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [pendingAction, setPendingAction] = useState<null | (() => void)>(null);
  const hasRunningAttempt = useSession(
    (s) => s.session?.state === 'running' && Object.keys(s.session.answers).length > 0,
  );

  useEffect(() => {
    void history.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsFor = (key: SubtestType) => {
    const sessions = history.sessions.filter((s) => s.subtest === key && s.score);
    if (sessions.length === 0) return null;
    return {
      attempts: sessions.length,
      last: sessions[0].score!.accuracy,
      best: Math.max(...sessions.map((s) => s.score!.accuracy)),
    };
  };

  const runningSession = useSession((s) =>
    s.session?.state === 'running' || s.session?.state === 'ready' ? s.session : null,
  );

  const todayAnswered = useMemo(() => {
    const dayStart = new Date().setHours(0, 0, 0, 0);
    return history.attempts.filter((a) => a.ts >= dayStart).length;
  }, [history.attempts]);

  const recent = useMemo(() => history.sessions.slice(0, 3), [history.sessions]);

  /** R1 restart semantics: discarding a live attempt needs a confirm. */
  const guarded = (action: () => void) => {
    if (hasRunningAttempt) setPendingAction(() => action);
    else action();
  };

  const generate = () =>
    guarded(() => {
      fullCoreStore.getState().reset();
      void sessionStore.getState().startNewSession({
        mode,
        subtest,
        difficulty,
        questionCount: count,
        seed: 0, // store draws a fresh seed
        equationAskMode: settings.equationAskMode,
        latinAlphabet: settings.latinAlphabet,
      });
      navigate('/run');
    });

  const startFullCore = () =>
    guarded(() => {
      fullCoreStore.getState().begin();
      void sessionStore.getState().startNewSession(fullCoreStore.getState().stageConfig());
      navigate('/run');
    });

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Practice the dMAT</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            Unlimited, freshly generated tasks in the official formats — with real exam timing.
          </p>
        </div>
        {daysToIndiaTest() !== null && (
          <Link
            to="/dmat-info"
            className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-tint/50 px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent-tint dark:border-accent-dark/30 dark:bg-accent/10 dark:text-accent-dark"
            title="Next official India test date: 26 September 2026"
          >
            <span className="tabular-nums">{daysToIndiaTest()}</span> days to the India test date
          </Link>
        )}
        {settings.dailyGoal > 0 && (
          <div
            className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 dark:border-zinc-800"
            title={`Daily goal: ${todayAnswered}/${settings.dailyGoal} questions today`}
          >
            <svg viewBox="0 0 36 36" className="h-8 w-8" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-200 dark:text-zinc-800" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke={todayAnswered >= settings.dailyGoal ? '#2E8B57' : '#A3195B'}
                strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${Math.min(1, todayAnswered / settings.dailyGoal) * 94.2} 94.2`}
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span className="text-sm font-semibold tabular-nums">
              {todayAnswered}/{settings.dailyGoal}
            </span>
            <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">today</span>
          </div>
        )}
      </div>

      {runningSession && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border-2 border-warning/40 bg-warning/5 p-4">
          <p className="text-sm">
            <strong>Test in progress:</strong>{' '}
            {runningSession.subtest === 'figures'
              ? 'Figure Sequences'
              : runningSession.subtest === 'equations'
                ? 'Mathematical Equations'
                : 'Latin Squares'}{' '}
            · {Object.keys(runningSession.answers).length}/{runningSession.questionCount} answered
          </p>
          <button
            type="button"
            onClick={() => navigate('/run')}
            className="rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Resume test →
          </button>
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Core Module — three subtests
      </h2>
      <div className="mt-2 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Choose a subtest">
        {SUBTESTS.map((s) => {
          const stats = statsFor(s.key);
          const active = subtest === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSubtest(s.key)}
              className={`rounded-card border-2 p-5 text-left transition-all ${
                active
                  ? 'border-accent bg-accent-tint/50 dark:border-accent-dark dark:bg-accent/10'
                  : 'border-zinc-200 bg-surface hover:-translate-y-px hover:shadow-card-lift dark:border-zinc-800 dark:bg-surface-dark-alt'
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold ${
                  active ? 'bg-accent text-white' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {s.icon}
              </span>
              <h2 className="mt-3 font-semibold">{s.name}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{s.description}</p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {stats
                  ? `${stats.attempts} attempt${stats.attempts === 1 ? '' : 's'} · last ${formatPercent(stats.last)} · best ${formatPercent(stats.best)}`
                  : 'Not attempted yet'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <div className="grid gap-5 sm:grid-cols-3">
          <fieldset>
            <legend className="text-sm font-semibold">Difficulty</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
                    difficulty === d
                      ? 'bg-accent text-white dark:bg-accent-dark'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">Set size</legend>
            <div className="mt-2 flex gap-1.5">
              {([3, 5, 10, 20] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                    count === n
                      ? 'bg-accent text-white dark:bg-accent-dark'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Exam format: 20 tasks in 25:00 (75 s each). 3 = quick warm-up.
            </p>
            {subtest === 'latin' && (
              <div className="mt-3">
                <p className="text-sm font-semibold">Symbols</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[...ALPHABET_IDS, 'random' as const].map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => settings.set('latinAlphabet', id)}
                      aria-pressed={settings.latinAlphabet === id}
                      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                        settings.latinAlphabet === id
                          ? 'bg-accent text-white dark:bg-accent-dark'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                      title={
                        id === 'random'
                          ? 'A different symbol set each question'
                          : Object.values(LATIN_ALPHABETS[id].glyphs).join(' ')
                      }
                    >
                      {id === 'random' ? 'Mix' : `${LATIN_ALPHABETS[id].glyphs.A} ${LATIN_ALPHABETS[id].glyphs.B} ${LATIN_ALPHABETS[id].glyphs.C}`}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  The real exam uses letters — the logic is identical with any symbols.
                </p>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold">Mode</legend>
            <div className="mt-2 flex gap-1.5">
              {(
                [
                  ['practice', 'Practice'],
                  ['exam', 'Exam simulation'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    mode === value
                      ? 'bg-accent text-white dark:bg-accent-dark'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === 'practice' && (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.instantFeedback}
                  onChange={(e) => settings.set('instantFeedback', e.target.checked)}
                  className="h-4 w-4 accent-[#A3195B]"
                />
                Instant feedback after each answer
              </label>
            )}
          </fieldset>
        </div>

        <button
          type="button"
          onClick={generate}
          className="mt-5 w-full rounded-xl bg-accent px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-accent-hover sm:w-auto"
        >
          Generate set
        </button>
      </div>

      <div className="mt-6 rounded-card border-2 border-accent/40 bg-surface p-6 shadow-card dark:border-accent-dark/40 dark:bg-surface-dark-alt">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">
              New: General Academic Module{' '}
              <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white align-middle">
                SoSe 2027
              </span>
            </h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
              The dMAT Subject Module for the India/APS requirement: passage-based questions across
              eight academic fields. Topic drills, timed sets, the full 90:00 exam, and the complete
              3.5-hour dMAT simulation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/gam')}
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Open GAM practice
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-card border-2 border-accent/30 bg-gradient-to-r from-accent-tint/60 to-surface p-6 shadow-card dark:border-accent-dark/30 dark:from-accent/10 dark:to-surface-dark-alt">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Full Core Module run</h2>
            <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-300">
              The complete exam simulation: Figure Sequences, Mathematical Equations, and Latin Squares —
              20 tasks and 25:00 each, with a 60-second break between subtests. About 80 minutes total.
            </p>
          </div>
          <button
            type="button"
            onClick={startFullCore}
            className="rounded-xl bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Start full run
          </button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
              Recent sessions
            </h2>
            <Link to="/history" className="text-sm font-semibold text-accent hover:underline dark:text-accent-dark">
              All history →
            </Link>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {recent.map((s) => (
              <Link
                key={s.id}
                to={`/review/${s.id}`}
                className="rounded-card border border-zinc-200 bg-surface p-3 text-sm shadow-card transition-all hover:-translate-y-px hover:shadow-card-lift dark:border-zinc-800 dark:bg-surface-dark-alt"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {s.subtest === 'figures' ? 'Figures' : s.subtest === 'equations' ? 'Equations' : 'Latin Squares'}
                  </span>
                  <span className={`font-bold tabular-nums ${s.score && s.score.accuracy >= 0.85 ? 'text-success' : ''}`}>
                    {s.score ? formatPercent(s.score.accuracy) : '—'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(s.createdAt).toLocaleDateString()} · {s.questionCount} questions ·{' '}
                  {s.score ? formatMs(s.score.totalTimeMs) : ''} · {s.mode}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard current attempt?"
        body="You have a test in progress with answers. Generating a fresh set discards it entirely — a brand-new set with a new random seed."
        confirmLabel="Discard and generate"
        danger
        onConfirm={() => {
          pendingAction?.();
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </section>
  );
}
