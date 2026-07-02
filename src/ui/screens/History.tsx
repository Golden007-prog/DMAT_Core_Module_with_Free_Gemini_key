import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHistory } from '../../state/historyStore';
import { sessionStore } from '../../state/sessionStore';
import { retryExactSet, retryMistakes } from '../../state/retry';
import { toast } from '../components/Toast';
import { formatMs, formatPercent } from '../format';

const SUBTEST_SHORT: Record<string, string> = {
  figures: 'Figures',
  equations: 'Equations',
  latin: 'Latin Squares',
};

export default function History() {
  const navigate = useNavigate();
  const { sessions, loaded, refresh } = useHistory();

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loaded && sessions.length === 0) {
    return (
      <section className="py-10 text-center">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          No completed sessions yet. Your finished runs land here, ready to review and retry.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover"
        >
          Start practicing
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-bold">History</h1>
      <div className="mt-4 overflow-x-auto rounded-card border border-zinc-200 bg-surface shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Subtest</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3 text-right">Questions</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Time</th>
              <th className="px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(s.createdAt).toLocaleDateString()}{' '}
                  <span className="text-zinc-400">
                    {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </td>
                <td className="px-4 py-3">{SUBTEST_SHORT[s.subtest] ?? s.subtest}</td>
                <td className="px-4 py-3 capitalize">{s.mode}</td>
                <td className="px-4 py-3 capitalize">{s.difficulty}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.questionCount}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {s.score ? formatPercent(s.score.accuracy) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {s.score ? formatMs(s.score.totalTimeMs) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <Link
                      to={`/review/${s.id}`}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent-tint dark:text-accent-dark dark:hover:bg-accent/15"
                    >
                      Review
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void retryExactSet(sessionStore, s);
                        navigate('/run');
                      }}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="Same questions, fresh answers"
                    >
                      Retry exact set
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await retryMistakes(sessionStore, s);
                        if (ok) navigate('/run');
                        else toast('Nothing to retry — every question was answered correctly.', 'success');
                      }}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      title="A new set from this run's wrong and unanswered questions"
                    >
                      Retry mistakes
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
