import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHistory } from '../../state/historyStore';
import { sessionStore } from '../../state/sessionStore';
import { retryExactSet, retryMistakes } from '../../state/retry';
import { getStorage } from '../../storage/db';
import { supabase } from '../../cloud/supabaseClient';
import { useAuth } from '../../cloud/authStore';
import { toast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatMs, formatPercent } from '../format';
import type { Session } from '../../engine/types';

const SUBTEST_SHORT: Record<string, string> = {
  figures: 'Figures',
  equations: 'Equations',
  latin: 'Latin Squares',
};

type SubtestFilter = 'all' | 'figures' | 'equations' | 'latin';
type ModeFilter = 'all' | 'practice' | 'exam';

export default function History() {
  const navigate = useNavigate();
  const { sessions, loaded, refresh } = useHistory();
  const [subtest, setSubtest] = useState<SubtestFilter>('all');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [pendingDelete, setPendingDelete] = useState<Session | null>(null);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) => (subtest === 'all' || s.subtest === subtest) && (mode === 'all' || s.mode === mode),
      ),
    [sessions, subtest, mode],
  );

  const aggregate = useMemo(() => {
    const scored = filtered.filter((s) => s.score);
    if (scored.length === 0) return null;
    return {
      count: scored.length,
      avg: scored.reduce((a, s) => a + s.score!.accuracy, 0) / scored.length,
      questions: scored.reduce((a, s) => a + s.questionCount, 0),
      time: scored.reduce((a, s) => a + s.score!.totalTimeMs, 0),
    };
  }, [filtered]);

  const doDelete = async (s: Session) => {
    const storage = await getStorage();
    await storage.deleteSession(s.id);
    const user = useAuth.getState().user;
    if (supabase && user) {
      await supabase.from('sessions').delete().eq('id', s.id).eq('user_id', user.id);
    }
    setPendingDelete(null);
    await refresh();
    toast('Session deleted.', 'success');
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">History</h1>
        <Link to="/mistakes" className="text-sm font-semibold text-accent hover:underline dark:text-accent-dark">
          Mistakes notebook →
        </Link>
      </div>

      {aggregate && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {aggregate.count} session{aggregate.count === 1 ? '' : 's'} · {aggregate.questions} questions ·{' '}
          {formatPercent(aggregate.avg)} average accuracy · {formatMs(aggregate.time)} practised
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(['all', 'figures', 'equations', 'latin'] as SubtestFilter[]).map((f) => (
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
            {f === 'all' ? 'All subtests' : SUBTEST_SHORT[f]}
          </button>
        ))}
        <span className="mx-1 hidden border-l border-zinc-200 sm:block dark:border-zinc-700" />
        {(['all', 'practice', 'exam'] as ModeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setMode(f)}
            aria-pressed={mode === f}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              mode === f
                ? 'bg-accent text-white dark:bg-accent-dark'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {f === 'all' ? 'All modes' : f}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-zinc-200 bg-surface shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <table className="w-full min-w-[680px] text-sm">
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
            {filtered.map((s) => (
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
                  <div className="flex justify-end gap-1.5 whitespace-nowrap">
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
                      Retry exact
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
                      Mistakes
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(s)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-error/10 hover:text-error"
                      aria-label="Delete session"
                      title="Delete this session"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No sessions match these filters.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this session?"
        body="The session, its answers, and its analytics rows are removed locally and from your cloud account. This cannot be undone."
        confirmLabel="Delete session"
        danger
        onConfirm={() => pendingDelete && void doDelete(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
