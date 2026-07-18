import type { Session } from '../engine/types';
import { computeSessionPoints } from '../state/points';
import { supabase } from './supabaseClient';
import { useAuth } from './authStore';
import { toast } from '../ui/components/Toast';
import { fxPromotion } from '../ui/feedbackFx';

/* ------------------------------- ISO weeks -------------------------------- */

/** ISO-8601 week key in UTC, e.g. "2026-W27". The leaderboard resets when
 *  this rolls over (Monday 00:00 UTC). */
export function weekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday decides the ISO year
  const isoYear = d.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

export function msUntilWeeklyReset(now = new Date()): number {
  const day = now.getUTCDay() || 7;
  const nextMonday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + (8 - day),
  );
  return nextMonday - now.getTime();
}

/* -------------------------------- leagues --------------------------------- */

export interface League {
  name: string;
  minPoints: number;
  color: string;
}

export const LEAGUES: League[] = [
  { name: 'Bronze', minPoints: 0, color: '#B08D57' },
  { name: 'Silver', minPoints: 300, color: '#8E9BA8' },
  { name: 'Gold', minPoints: 800, color: '#D9A514' },
  { name: 'Diamond', minPoints: 1600, color: '#38BDF8' },
  { name: 'Legend', minPoints: 3000, color: '#A3195B' },
  { name: 'Master', minPoints: 5000, color: '#7C3AED' },
  { name: 'Grandmaster', minPoints: 8000, color: '#DC2626' },
  { name: 'Champion', minPoints: 12000, color: '#0D9488' },
  { name: 'Immortal', minPoints: 16000, color: '#1B1B1F' },
];

export function leagueFor(points: number): League {
  let league = LEAGUES[0];
  for (const l of LEAGUES) if (points >= l.minPoints) league = l;
  return league;
}

export function nextLeague(points: number): League | null {
  return LEAGUES.find((l) => l.minPoints > points) ?? null;
}

/* -------------------------------- modules --------------------------------- */

/** Two ranking boards plus a client-side combined view. */
export type RankingModule = 'core' | 'gam' | 'combined';

/** The board a session scores on, keyed off its per-session subtest. The GAM
 *  stage of a full-dMAT run is saved as its own subtest 'gam' session, so it
 *  lands on the GAM board even though 'full-dmat' itself is a Core label. */
export function moduleForSubtest(subtest: Session['subtest']): 'core' | 'gam' {
  return subtest === 'gam' ? 'gam' : 'core';
}

/* ------------------------------ leaderboard ------------------------------- */

export interface LeaderboardRow {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  sessions: number;
  rank: number;
  league: League;
  isMe: boolean;
}

export interface ModuleAggregate {
  module: 'core' | 'gam';
  points: number;
  sessions: number;
}

/** Buckets a week's scored sessions into per-module point/session totals.
 *  Pure and recompute-from-source: only sessions dated in `week` that carry a
 *  score count, and each contributes to exactly one module. Returns one entry
 *  per module that actually has sessions, so callers write nothing for a
 *  module the user hasn't touched. */
export function bucketSessionsByModule(sessions: Session[], week = weekKey()): ModuleAggregate[] {
  const buckets = new Map<'core' | 'gam', { points: number; sessions: number }>();
  for (const session of sessions) {
    if (weekKey(new Date(session.createdAt)) !== week || !session.score) continue;
    const module = moduleForSubtest(session.subtest);
    const agg = buckets.get(module) ?? { points: 0, sessions: 0 };
    agg.points += computeSessionPoints(session).total;
    agg.sessions += 1;
    buckets.set(module, agg);
  }
  return [...buckets].map(([module, agg]) => ({ module, ...agg }));
}

/**
 * Recomputes this week's points from the user's OWN cloud sessions and upserts
 * one row per module that has sessions. Recompute-from-source is idempotent:
 * refreshes, re-syncs, and resumed sessions can never double-count.
 */
export async function pushWeeklyScore(): Promise<void> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return;

  const week = weekKey();
  const { data, error } = await supabase
    .from('sessions')
    .select('payload')
    .eq('user_id', user.id)
    .gte('created_at', new Date(Date.now() - 8 * 86_400_000).toISOString());
  if (error || !data) return;

  const buckets = bucketSessionsByModule(
    data.map((row) => row.payload as Session),
    week,
  );
  if (buckets.length === 0) return;

  // league promotion is judged on the COMBINED total across modules, so read
  // every stored module row for the week before the upsert overwrites them
  const { data: prev } = await supabase
    .from('weekly_scores')
    .select('points')
    .eq('user_id', user.id)
    .eq('week', week);
  const beforeTotal = (prev ?? []).reduce((sum, r) => sum + (r.points as number), 0);

  const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'Anonymous';
  const now = new Date().toISOString();
  await supabase.from('weekly_scores').upsert(
    buckets.map((b) => ({
      user_id: user.id,
      week,
      module: b.module,
      points: b.points,
      sessions: b.sessions,
      display_name: displayName,
      avatar_url: user.avatarUrl,
      updated_at: now,
    })),
    { onConflict: 'user_id,week,module' },
  );

  const afterTotal = buckets.reduce((sum, b) => sum + b.points, 0);
  const before = leagueFor(beforeTotal);
  const after = leagueFor(afterTotal);
  if (after.minPoints > before.minPoints) {
    fxPromotion();
    toast(`Promoted to ${after.name} league! 🏆`, 'success');
  }
}

/** ISO week key shifted by whole weeks (e.g. -1 = last week). */
export function shiftedWeekKey(offsetWeeks: number, now = new Date()): string {
  return weekKey(new Date(now.getTime() + offsetWeeks * 7 * 86_400_000));
}

/** Raw weekly_scores row as read back from the cloud (one per user+module). */
export interface WeeklyScoreRow {
  user_id: string;
  points: number;
  sessions: number;
  display_name: string | null;
  avatar_url: string | null;
  updated_at?: string | null;
}

function toLeaderboardRow(r: WeeklyScoreRow, rank: number, meId?: string): LeaderboardRow {
  return {
    userId: r.user_id,
    displayName: r.display_name || 'Anonymous',
    avatarUrl: r.avatar_url ?? null,
    points: r.points,
    sessions: r.sessions,
    rank,
    league: leagueFor(r.points),
    isMe: r.user_id === meId,
  };
}

/** Combined board: weekly_scores holds one row per (user, module), so a user
 *  can have up to two rows. Sum them into a single row and re-sort by points,
 *  keeping the most recently updated name/avatar snapshot. Ties break by
 *  earliest update, matching the server-side ordering. */
export function combineLeaderboardRows(rows: WeeklyScoreRow[]): WeeklyScoreRow[] {
  const byUser = new Map<string, WeeklyScoreRow>();
  for (const r of rows) {
    const existing = byUser.get(r.user_id);
    if (!existing) {
      byUser.set(r.user_id, { ...r });
      continue;
    }
    existing.points += r.points;
    existing.sessions += r.sessions;
    if ((r.updated_at ?? '') > (existing.updated_at ?? '')) {
      existing.display_name = r.display_name;
      existing.avatar_url = r.avatar_url;
      existing.updated_at = r.updated_at;
    }
  }
  return [...byUser.values()].sort(
    (a, b) => b.points - a.points || (a.updated_at ?? '').localeCompare(b.updated_at ?? ''),
  );
}

/** Top rows for a week plus the signed-in user's own row/rank. `module`
 *  picks a board: 'core' and 'gam' filter server-side; 'combined' (the
 *  default) over-fetches every module row and sums per user in JS, because
 *  Postgres can't group the two boards in one indexed query. Combined ranks
 *  are exact within the fetched slice (over-fetched by the max module count). */
export async function fetchWeeklyLeaderboard(
  limit = 100,
  week = weekKey(),
  module: RankingModule = 'combined',
): Promise<{
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
  week: string;
}> {
  const user = useAuth.getState().user;
  if (!supabase) return { rows: [], me: null, week };

  if (module === 'combined') {
    // one row per (user, module) → over-fetch by the module count (max 2/user)
    // so the top `limit` users survive the client-side sum.
    const { data, error } = await supabase
      .from('weekly_scores')
      .select('user_id, points, sessions, display_name, avatar_url, updated_at')
      .eq('week', week)
      .order('points', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(limit * 2);
    if (error || !data) return { rows: [], me: null, week };

    const combined = combineLeaderboardRows(data as WeeklyScoreRow[]);
    const rows = combined.slice(0, limit).map((r, i) => toLeaderboardRow(r, i + 1, user?.id));

    let me = rows.find((r) => r.isMe) ?? null;
    if (!me && user) {
      const idx = combined.findIndex((r) => r.user_id === user.id);
      if (idx >= 0) {
        me = toLeaderboardRow(combined[idx], idx + 1, user.id);
      } else {
        // outside the fetched slice → sum just this user's own module rows
        const { data: own } = await supabase
          .from('weekly_scores')
          .select('user_id, points, sessions, display_name, avatar_url, updated_at')
          .eq('week', week)
          .eq('user_id', user.id);
        const merged =
          own && own.length > 0 ? combineLeaderboardRows(own as WeeklyScoreRow[])[0] : null;
        if (merged) me = toLeaderboardRow(merged, combined.length + 1, user.id);
      }
    }
    return { rows, me, week };
  }

  const { data, error } = await supabase
    .from('weekly_scores')
    .select('user_id, points, sessions, display_name, avatar_url')
    .eq('week', week)
    .eq('module', module)
    .order('points', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error || !data) return { rows: [], me: null, week };

  const rows = (data as WeeklyScoreRow[]).map((r, i) => toLeaderboardRow(r, i + 1, user?.id));

  let me = rows.find((r) => r.isMe) ?? null;
  if (!me && user) {
    // not in the top slice → fetch own row and count those ahead of it
    const { data: own } = await supabase
      .from('weekly_scores')
      .select('user_id, points, sessions, display_name, avatar_url')
      .eq('week', week)
      .eq('module', module)
      .eq('user_id', user.id)
      .maybeSingle();
    if (own) {
      const ownRow = own as WeeklyScoreRow;
      const { count } = await supabase
        .from('weekly_scores')
        .select('user_id', { count: 'exact', head: true })
        .eq('week', week)
        .eq('module', module)
        .gt('points', ownRow.points);
      me = toLeaderboardRow(ownRow, (count ?? 0) + 1, user.id);
    }
  }

  return { rows, me, week };
}
