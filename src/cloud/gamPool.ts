import type { Difficulty, GamPassage, GamTopicArea } from '../engine/types';
import { gamContentHash, validateGamPassage } from '../engine/gam/validate';
import { supabase } from './supabaseClient';
import { useAuth } from './authStore';

/**
 * Community GAM passage pool — mirrors cloud/questionPool.ts: every locally
 * validated AI passage is contributed once (content-hash deduplicated) and
 * shared with all signed-in users, so keyless users get AI variety with one
 * indexed read instead of a model call. Append-only under RLS.
 */

export async function contributeGamPassages(passages: GamPassage[]): Promise<void> {
  if (!supabase) return;
  const user = useAuth.getState().user;
  if (!user || passages.length === 0) return;
  const rows = passages.map((p) => ({
    topic_area: p.topicArea,
    difficulty: p.difficulty,
    content_hash: gamContentHash(p),
    passage: p,
    source: p.source,
    created_by: user.id,
  }));
  await supabase
    .from('gam_passages')
    .upsert(rows, { onConflict: 'content_hash', ignoreDuplicates: true });
}

/** Newest pool passages matching the filter — every row re-validated before
 *  use (R6: storage is never trusted blindly), stamped source 'pool'. */
export async function pullPoolGamPassages(
  opts: {
    topicAreas?: GamTopicArea[];
    difficulty?: Difficulty | 'mixed';
    limit?: number;
  } = {},
): Promise<GamPassage[]> {
  if (!supabase) return [];
  const user = useAuth.getState().user;
  if (!user) return [];

  let query = supabase
    .from('gam_passages')
    .select('content_hash, passage')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 12);
  if (opts.topicAreas && opts.topicAreas.length > 0) {
    query = query.in('topic_area', opts.topicAreas);
  }
  if (opts.difficulty && opts.difficulty !== 'mixed') {
    query = query.eq('difficulty', opts.difficulty);
  }

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
  const res = await Promise.race([query, timeout]).catch(() => null);
  if (!res || res.error || !res.data) return [];

  const out: GamPassage[] = [];
  const seen = new Set<string>();
  for (const row of res.data as Array<{ content_hash: string; passage: GamPassage }>) {
    if (seen.has(row.content_hash)) continue;
    seen.add(row.content_hash);
    const passage = row.passage;
    if (validateGamPassage(passage).ok) out.push({ ...passage, source: 'pool' });
  }
  return out;
}
