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
];

export function leagueFor(points: number): League {
  let league = LEAGUES[0];
  for (const l of LEAGUES) if (points >= l.minPoints) league = l;
  return league;
}

export function nextLeague(points: number): League | null {
  return LEAGUES.find((l) => l.minPoints > points) ?? null;
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

/**
 * Recomputes this week's points from the user's OWN cloud sessions and
 * upserts the result. Recompute-from-source is idempotent: refreshes,
 * re-syncs, and resumed sessions can never double-count.
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

  let points = 0;
  let sessionCount = 0;
  for (const row of data) {
    const session = row.payload as Session;
    if (weekKey(new Date(session.createdAt)) !== week || !session.score) continue;
    points += computeSessionPoints(session).total;
    sessionCount++;
  }

  // league promotion detection: compare against the stored row before upsert
  const { data: prev } = await supabase
    .from('weekly_scores')
    .select('points')
    .eq('user_id', user.id)
    .eq('week', week)
    .maybeSingle();

  await supabase.from('weekly_scores').upsert({
    user_id: user.id,
    week,
    points,
    sessions: sessionCount,
    display_name: user.displayName ?? user.email?.split('@')[0] ?? 'Anonymous',
    avatar_url: user.avatarUrl,
    updated_at: new Date().toISOString(),
  });

  const before = leagueFor((prev?.points as number) ?? 0);
  const after = leagueFor(points);
  if (after.minPoints > before.minPoints) {
    fxPromotion();
    toast(`Promoted to ${after.name} league! 🏆`, 'success');
  }
}

/** ISO week key shifted by whole weeks (e.g. -1 = last week). */
export function shiftedWeekKey(offsetWeeks: number, now = new Date()): string {
  return weekKey(new Date(now.getTime() + offsetWeeks * 7 * 86_400_000));
}

/** Top rows for a week plus the signed-in user's own row/rank. */
export async function fetchWeeklyLeaderboard(
  limit = 100,
  week = weekKey(),
): Promise<{
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
  week: string;
}> {
  const user = useAuth.getState().user;
  if (!supabase) return { rows: [], me: null, week };

  const { data, error } = await supabase
    .from('weekly_scores')
    .select('user_id, points, sessions, display_name, avatar_url')
    .eq('week', week)
    .order('points', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error || !data) return { rows: [], me: null, week };

  const rows: LeaderboardRow[] = data.map((r, i) => ({
    userId: r.user_id as string,
    displayName: (r.display_name as string) || 'Anonymous',
    avatarUrl: (r.avatar_url as string) ?? null,
    points: r.points as number,
    sessions: r.sessions as number,
    rank: i + 1,
    league: leagueFor(r.points as number),
    isMe: r.user_id === user?.id,
  }));

  let me = rows.find((r) => r.isMe) ?? null;
  if (!me && user) {
    // not in the top slice → fetch own row and compute the rank
    const { data: own } = await supabase
      .from('weekly_scores')
      .select('points, sessions, display_name, avatar_url')
      .eq('week', week)
      .eq('user_id', user.id)
      .maybeSingle();
    if (own) {
      const { count } = await supabase
        .from('weekly_scores')
        .select('user_id', { count: 'exact', head: true })
        .eq('week', week)
        .gt('points', own.points as number);
      me = {
        userId: user.id,
        displayName: (own.display_name as string) || 'Anonymous',
        avatarUrl: (own.avatar_url as string) ?? null,
        points: own.points as number,
        sessions: own.sessions as number,
        rank: (count ?? 0) + 1,
        league: leagueFor(own.points as number),
        isMe: true,
      };
    }
  }

  return { rows, me, week };
}
