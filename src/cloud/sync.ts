import type { Session } from '../engine/types';
import { getStorage, type AttemptRow } from '../storage/db';
import { isAnswerCorrect } from '../state/scoring';
import { sessionStore } from '../state/sessionStore';
import { repairModelChain, useSettings } from '../state/settingsStore';
import { useHistory } from '../state/historyStore';
import { supabase } from './supabaseClient';
import { useAuth } from './authStore';
import { pushWeeklyScore } from './rankings';
import { toast } from '../ui/components/Toast';

/** Everything a signed-in user does is mirrored to their Supabase rows:
 *  finished sessions (with full question payloads), settings — including the
 *  user's own Gemini key, so it is entered once and follows them across
 *  devices (stored in their RLS-protected row only) — and generated sets.
 *  All pushes are fire-and-forget; the app never blocks on the network. */

export async function pushSession(session: Session): Promise<void> {
  const user = useAuth.getState().user;
  if (!supabase || !user || !session.score) return;
  await supabase.from('sessions').upsert({
    id: session.id,
    user_id: user.id,
    subtest: session.subtest,
    mode: session.mode,
    difficulty: session.difficulty,
    question_count: session.questionCount,
    accuracy: session.score.accuracy,
    created_at: new Date(session.createdAt).toISOString(),
    payload: session,
  });
}

/** Attempts are derivable from a finished session — rebuild them for
 *  sessions pulled from the cloud so local analytics stay complete. */
function deriveAttempts(session: Session): AttemptRow[] {
  return session.questions.map((q) => ({
    id: crypto.randomUUID(),
    sessionId: session.id,
    questionId: q.id,
    type: q.type,
    difficulty: q.difficulty,
    ruleTags: q.ruleTags,
    correct: isAnswerCorrect(q, session.answers[q.id]),
    timeMs: session.answerTimesMs[q.id] ?? 0,
    ts: session.finishedAt ?? session.createdAt,
  }));
}

export async function pullSessions(): Promise<number> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return 0;
  const { data, error } = await supabase
    .from('sessions')
    .select('id, payload')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error || !data) return 0;

  const storage = await getStorage();
  let imported = 0;
  for (const row of data) {
    const existing = await storage.getSession(row.id as string);
    if (existing) continue;
    const session = row.payload as Session;
    await storage.saveSession(session);
    await storage.addAttempts(deriveAttempts(session));
    imported++;
  }
  if (imported > 0) await useHistory.getState().refresh();
  return imported;
}

function settingsSnapshot(): Record<string, unknown> {
  const s = useSettings.getState();
  return {
    equationAskMode: s.equationAskMode,
    examNavFree: s.examNavFree,
    instantFeedback: s.instantFeedback,
    hideTimer: s.hideTimer,
    geminiKey: s.geminiKey, // entered once, follows the account (own row, RLS)
    modelChain: s.modelChain,
    aiDailyBudget: s.aiDailyBudget,
    aiEquationsEnabled: s.aiEquationsEnabled,
  };
}

export async function pushSettings(): Promise<void> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return;
  await supabase.from('user_settings').upsert({
    user_id: user.id,
    payload: settingsSnapshot(),
    updated_at: new Date().toISOString(),
  });
}

export async function pullSettings(): Promise<void> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return;
  const { data } = await supabase
    .from('user_settings')
    .select('payload')
    .eq('user_id', user.id)
    .maybeSingle();
  const payload = data?.payload as Record<string, unknown> | undefined;
  if (!payload) {
    await pushSettings(); // first device: seed the cloud copy
    return;
  }
  const set = useSettings.getState().set;
  const localKey = useSettings.getState().geminiKey;
  for (const [key, value] of Object.entries(payload)) {
    // never let an empty cloud value wipe a key the user just typed locally
    if (key === 'geminiKey' && !value && localKey) continue;
    // The cloud row is a chain that never passed through THIS device's migration:
    // it was written by whichever device pushed last, possibly still on an old
    // build, and re-injecting it verbatim on every sign-in would reinstate a dead
    // or backwards chain the local repair had already fixed — permanently, since
    // it then persists at the current version and migrate never sees it again.
    // Same repair the store applies on rehydration, applied at the same boundary.
    if (key === 'modelChain') {
      set('modelChain', repairModelChain(value));
      continue;
    }
    set(key as never, value as never);
  }
}

async function ensureProfile(): Promise<void> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return;
  await supabase.from('profiles').upsert({
    id: user.id,
    display_name: user.displayName,
    avatar_url: user.avatarUrl,
    updated_at: new Date().toISOString(),
  });
}

export async function fullSync(): Promise<void> {
  await ensureProfile();
  await pullSettings();
  const imported = await pullSessions();
  if (imported > 0) {
    toast(`Synced ${imported} session${imported === 1 ? '' : 's'} from your account.`, 'success');
  }
}

let wired = false;

/** Wires cloud sync to app events. Idempotent; a no-op without Supabase. */
export function initCloudSync(): void {
  if (wired || !supabase) return;
  wired = true;

  // sign-in → pull everything down once
  let lastUserId: string | null = null;
  useAuth.subscribe((state) => {
    if (state.user && state.user.id !== lastUserId) {
      lastUserId = state.user.id;
      void fullSync().catch(() => {});
    }
    if (!state.user) lastUserId = null;
  });

  // finished session → push, then refresh this week's leaderboard score
  // (points are recomputed from the cloud sessions, so this is idempotent)
  let lastPushedId: string | null = null;
  sessionStore.subscribe((state) => {
    const s = state.session;
    if (s && (s.state === 'finished' || s.state === 'reviewed') && s.id !== lastPushedId) {
      lastPushedId = s.id;
      void pushSession(s)
        .then(() => pushWeeklyScore())
        .catch(() => {});
    }
  });

  // settings changes → debounced push
  let timer: number | undefined;
  useSettings.subscribe(() => {
    if (!useAuth.getState().user) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void pushSettings().catch(() => {}), 2000);
  });
}
