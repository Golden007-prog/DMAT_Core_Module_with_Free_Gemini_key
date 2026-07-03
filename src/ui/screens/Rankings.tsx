import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchWeeklyLeaderboard,
  msUntilWeeklyReset,
  nextLeague,
  LEAGUES,
  type LeaderboardRow,
} from '../../cloud/rankings';
import { POINTS_PER_CORRECT, MIXED_SET_MULTIPLIER } from '../../state/points';
import { cloudEnabled } from '../../cloud/supabaseClient';

function LeagueBadge({ row }: { row: LeaderboardRow }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
      style={{ background: row.league.color }}
    >
      {row.league.name}
    </span>
  );
}

function Avatar({ row }: { row: LeaderboardRow }) {
  return row.avatarUrl ? (
    <img src={row.avatarUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
  ) : (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-300 text-sm font-bold text-white dark:bg-zinc-600">
      {row.displayName[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

function resetCountdown(): string {
  const ms = msUntilWeeklyReset();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

export default function Rankings() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<LeaderboardRow | null>(null);
  const [week, setWeek] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchWeeklyLeaderboard().then((r) => {
      if (cancelled) return;
      setRows(r.rows);
      setMe(r.me);
      setWeek(r.week);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const upgrade = me ? nextLeague(me.points) : LEAGUES[1];

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Weekly Rankings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {week ? `${week} · ` : ''}resets in {resetCountdown()} (Mon 00:00 UTC)
        </p>
      </div>

      {/* your card */}
      <div className="mt-4 rounded-card border border-zinc-200 bg-surface p-5 shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        {me ? (
          <div className="flex flex-wrap items-center gap-4">
            <Avatar row={me} />
            <div className="min-w-0">
              <p className="font-semibold">
                #{me.rank} · {me.displayName} <LeagueBadge row={me} />
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {me.points} points from {me.sessions} session{me.sessions === 1 ? '' : 's'} this week
              </p>
            </div>
            {upgrade && (
              <div className="ml-auto w-full sm:w-56">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {upgrade.minPoints - me.points} points to {upgrade.name}
                </p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (me.points / upgrade.minPoints) * 100)}%`,
                      background: upgrade.color,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Finish a practice or exam set this week and you'll appear on the board — points land
            automatically.
          </p>
        )}
      </div>

      {/* how points work */}
      <details className="mt-3 rounded-card border border-zinc-200 bg-surface p-4 text-sm shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        <summary className="cursor-pointer font-semibold">How points work</summary>
        <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-300">
          <li>
            Each correct answer: <strong>{POINTS_PER_CORRECT.easy}</strong> (easy) ·{' '}
            <strong>{POINTS_PER_CORRECT.medium}</strong> (medium) ·{' '}
            <strong>{POINTS_PER_CORRECT.hard}</strong> (hard).
          </li>
          <li>Mixed sets: ×{MIXED_SET_MULTIPLIER} on the whole set.</li>
          <li>
            Finish under the time budget with every question answered → up to +50% bonus,
            proportional to the time you saved.
          </li>
          <li>Wrong or blank answers earn nothing — accuracy first, speed second.</li>
          <li>
            Leagues by weekly points:{' '}
            {LEAGUES.map((l, i) => (
              <span key={l.name}>
                {i > 0 && ' · '}
                <strong style={{ color: l.color }}>{l.name}</strong> {l.minPoints}+
              </span>
            ))}
          </li>
        </ul>
      </details>

      {/* leaderboard */}
      <div className="mt-3 overflow-hidden rounded-card border border-zinc-200 bg-surface shadow-card dark:border-zinc-800 dark:bg-surface-dark-alt">
        {loading ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading the board…</p>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center">
            <p className="font-semibold">The board is empty this week.</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {cloudEnabled
                ? 'Be the first: finish any set and claim #1.'
                : 'Cloud sync is not configured in this build.'}
            </p>
            <Link
              to="/"
              className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Start a set
            </Link>
          </div>
        ) : (
          <ol>
            {rows.map((r) => (
              <li
                key={r.userId}
                className={`flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5 last:border-0 dark:border-zinc-800/60 ${
                  r.isMe ? 'bg-accent-tint/50 dark:bg-accent/10' : ''
                }`}
              >
                <span className={`w-8 text-right font-bold tabular-nums ${r.rank <= 3 ? 'text-accent dark:text-accent-dark' : 'text-zinc-400'}`}>
                  {r.rank}
                </span>
                <Avatar row={r} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {r.displayName}
                  {r.isMe && <span className="ml-1 text-xs text-zinc-400">(you)</span>}
                </span>
                <LeagueBadge row={r} />
                <span className="w-16 text-right font-semibold tabular-nums">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
