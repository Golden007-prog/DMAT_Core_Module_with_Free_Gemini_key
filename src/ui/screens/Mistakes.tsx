import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHistory } from '../../state/historyStore';
import { sessionStore } from '../../state/sessionStore';
import { isAnswerCorrect } from '../../state/scoring';
import type { Question, SubtestType } from '../../engine/types';
import { ruleTagLabel } from '../ruleTagLabels';

const SUBTEST_NAMES: Record<SubtestType, string> = {
  figures: 'Figures',
  equations: 'Equations',
  latin: 'Latin Squares',
  gam: 'General Academic',
};

interface MistakeEntry {
  question: Question;
  when: number;
}

/** All-time wrong-answer notebook: every missed question across sessions,
 *  drillable as a fresh set. */
export default function Mistakes() {
  const navigate = useNavigate();
  const { sessions, loaded, refresh } = useHistory();
  const [subtest, setSubtest] = useState<SubtestType | 'all'>('all');

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mistakes = useMemo(() => {
    const out: MistakeEntry[] = [];
    for (const s of sessions) {
      if (!s.score) continue;
      for (const q of s.questions) {
        if (!isAnswerCorrect(q, s.answers[q.id])) {
          out.push({ question: q, when: s.createdAt });
        }
      }
    }
    return out.sort((a, b) => b.when - a.when);
  }, [sessions]);

  const filtered = useMemo(
    () => (subtest === 'all' ? mistakes : mistakes.filter((m) => m.question.type === subtest)),
    [mistakes, subtest],
  );

  const drill = (n: number) => {
    const pick = filtered.slice(0, n).map((m) => {
      const copy = JSON.parse(JSON.stringify(m.question)) as Question;
      copy.id = crypto.randomUUID(); // fresh UUID (R5)
      return copy;
    });
    if (pick.length === 0) return;
    const type = subtest === 'all' ? pick[0].type : subtest;
    void sessionStore.getState().startSessionFromQuestions(
      pick.filter((q) => (subtest === 'all' ? q.type === type : true)),
      { mode: 'practice', subtest: type, difficulty: 'mixed' },
    );
    navigate('/run');
  };

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of filtered) {
      for (const t of m.question.ruleTags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filtered]);

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mistakes notebook</h1>
        <Link to="/history" className="text-sm font-semibold text-accent hover:underline dark:text-accent-dark">
          ← History
        </Link>
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Every question you missed or skipped, newest first. Drill them until they stop appearing.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(['all', 'figures', 'equations', 'latin'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setSubtest(f)}
            aria-pressed={subtest === f}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              subtest === f
                ? 'bg-accent text-white dark:bg-accent-dark'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {f === 'all' ? `All (${mistakes.length})` : `${SUBTEST_NAMES[f]} (${mistakes.filter((m) => m.question.type === f).length})`}
          </button>
        ))}
      </div>

      {loaded && filtered.length === 0 ? (
        <div className="mt-8 rounded-card border border-zinc-200 bg-surface p-8 text-center shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
          <p className="font-semibold">Nothing here — clean slate.</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Missed questions collect in this notebook automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {[5, 10, 20]
              .filter((n) => filtered.length >= Math.min(n, 3))
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => drill(n)}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
                >
                  Drill latest {Math.min(n, filtered.length)}
                </button>
              ))}
          </div>

          {tagCounts.length > 0 && (
            <div className="mt-4 rounded-card border border-zinc-200 bg-surface p-4 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                What these mistakes have in common
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {tagCounts.map(([tag, n]) => (
                  <li key={tag} className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
                    {ruleTagLabel(tag)} <span className="font-semibold">×{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {filtered.slice(0, 50).map((m, i) => (
              <li
                key={`${m.question.id}-${i}`}
                className="flex items-center gap-3 rounded-card border border-zinc-200 bg-surface px-4 py-2.5 text-sm shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt"
              >
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">
                  {SUBTEST_NAMES[m.question.type]}
                </span>
                <span className="capitalize text-zinc-500 dark:text-zinc-400">{m.question.difficulty}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-300">
                  {m.question.type === 'equations'
                    ? m.question.equationsDisplay.join('  ·  ')
                    : m.question.type === 'latin'
                      ? `Find the "?" — depth ${m.question.inferenceDepth}`
                      : m.question.type === 'gam'
                        ? m.question.stem
                        : m.question.ruleDescriptions[0]}
                </span>
                <span className="text-xs whitespace-nowrap text-zinc-400">
                  {new Date(m.when).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
          {filtered.length > 50 && (
            <p className="mt-2 text-center text-xs text-zinc-400">Showing the latest 50 of {filtered.length}.</p>
          )}
        </>
      )}
    </section>
  );
}
