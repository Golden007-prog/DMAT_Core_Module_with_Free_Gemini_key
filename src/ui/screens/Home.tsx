import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionStore } from '../../state/sessionStore';
import { useHistory } from '../../state/historyStore';
import { useSettings } from '../../state/settingsStore';
import type { Difficulty, SubtestType } from '../../engine/types';
import { formatPercent } from '../format';

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
  const [count, setCount] = useState<5 | 10 | 20>(10);
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');

  useEffect(() => {
    void history.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statsFor = (key: SubtestType) => {
    const sessions = history.sessions.filter((s) => s.subtest === key && s.score);
    if (sessions.length === 0) return null;
    return { attempts: sessions.length, last: sessions[0].score!.accuracy };
  };

  const generate = () => {
    void sessionStore.getState().startNewSession({
      mode,
      subtest,
      difficulty,
      questionCount: count,
      seed: 0, // store draws a fresh seed
    });
    navigate('/run');
  };

  return (
    <section>
      <h1 className="text-2xl font-bold">Practice the dMAT Core Module</h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-300">
        Unlimited, freshly generated tasks in the official formats — with real exam timing.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Choose a subtest">
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
                  ? `${stats.attempts} attempt${stats.attempts === 1 ? '' : 's'} · last ${formatPercent(stats.last)}`
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
              {([5, 10, 20] as const).map((n) => (
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
              Exam format: 20 tasks in 25:00 (75 s each).
            </p>
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
    </section>
  );
}
