import type { EquationQuestion, Question } from '../engine/types';
import type { GenerateSetConfig } from '../engine/generateSet';
import { validateQuestion } from '../engine/generateSet';
import { getStorage } from '../storage/db';
import { supabase } from './supabaseClient';
import { useAuth } from './authStore';

/**
 * Community question pool: every AI-generated, locally validated question is
 * contributed once (content-hash deduplicated) and shared with all signed-in
 * users — keyless users get AI variety with a single fast read instead of a
 * model call.
 */

/** Canonical content hash: identical task content → identical hash, no matter
 *  which user/session/seed produced it or how the options were shuffled. */
export async function questionContentHash(q: Question): Promise<string> {
  let canonical: string;
  if (q.type === 'equations') {
    canonical = JSON.stringify({
      t: 'equations',
      e: [...q.equationsDisplay].sort(),
      s: Object.keys(q.solution)
        .sort()
        .map((k) => `${k}=${q.solution[k]}`),
      m: q.askMode,
    });
  } else if (q.type === 'latin') {
    canonical = JSON.stringify({ t: 'latin', g: q.grid, q: q.question });
  } else if (q.type === 'gam') {
    // shuffle-invariant: options sorted, answer identified by its text
    canonical = JSON.stringify({
      t: 'gam',
      s: q.stem.trim().toLowerCase(),
      o: q.options.map((o) => o.trim().toLowerCase()).sort(),
      a: q.options[q.correct].trim().toLowerCase(),
    });
  } else {
    canonical = JSON.stringify({
      t: 'figures',
      f: q.givenFrames,
      i1: q.image1,
      i2: q.image2,
    });
  }
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Pure: keep only valid, unseen candidates — the serving-side "don't repeat"
 *  guarantee (the unique content_hash is the storage-side one). */
export function selectFreshQuestions(
  candidates: Array<{ question: Question; hash: string }>,
  seenHashes: Set<string>,
  count: number,
): Question[] {
  const fresh: Question[] = [];
  const used = new Set<string>();
  for (const c of candidates) {
    if (fresh.length >= count) break;
    if (seenHashes.has(c.hash) || used.has(c.hash)) continue;
    if (!validateQuestion(c.question).ok) continue; // R6: never trust storage blindly
    used.add(c.hash);
    fresh.push({ ...c.question, id: crypto.randomUUID() }); // fresh UUID per session (R5)
  }
  return fresh;
}

let seenCache: Set<string> | null = null;

/** Hashes of every equation question this user has already faced (from local
 *  history) — pooled sets never repeat them. */
export async function localSeenHashes(): Promise<Set<string>> {
  if (seenCache) return seenCache;
  const seen = new Set<string>();
  try {
    const storage = await getStorage();
    for (const session of await storage.listSessions()) {
      for (const q of session.questions) {
        if (q.type === 'equations') seen.add(await questionContentHash(q));
      }
    }
  } catch {
    /* no history yet */
  }
  seenCache = seen;
  return seen;
}

export function markSeen(hashes: string[]): void {
  if (!seenCache) return;
  for (const h of hashes) seenCache.add(h);
}

/** Contribute validated AI questions to the shared pool. Duplicate content is
 *  silently ignored by the unique content_hash — the pool never repeats. */
export async function contributeQuestions(questions: Question[], source: string): Promise<void> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return;
  const rows = await Promise.all(
    questions.map(async (q) => ({
      subtest: q.type,
      difficulty: q.difficulty,
      content_hash: await questionContentHash(q),
      question: q,
      source,
      created_by: user.id,
    })),
  );
  await supabase.from('question_pool').upsert(rows, {
    onConflict: 'content_hash',
    ignoreDuplicates: true,
  });
}

/** One fast indexed read serves a whole set for keyless users. Returns null
 *  when the pool can't fill the set with questions this user hasn't seen —
 *  the caller then falls back to the deterministic generator (R7). */
export async function pullPoolEquationSet(
  cfg: GenerateSetConfig,
  timeoutMs = 2500,
): Promise<{ questions: Question[]; source: 'gemini+validated' } | null> {
  const user = useAuth.getState().user;
  if (!supabase || !user || cfg.difficulty === 'mixed') return null;
  try {
    const query = supabase
      .from('question_pool')
      .select('question, content_hash')
      .eq('subtest', 'equations')
      .eq('difficulty', cfg.difficulty)
      .order('created_at', { ascending: false })
      .limit(cfg.count * 5);
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
    const result = await Promise.race([query, timeout]);
    if (!result || result.error || !result.data) return null;

    const seen = await localSeenHashes();
    const candidates = result.data.map((row) => ({
      question: row.question as Question,
      hash: row.content_hash as string,
    }));
    const questions = selectFreshQuestions(candidates, seen, cfg.count);
    if (questions.length < cfg.count) return null;
    markSeen(await Promise.all(questions.map(questionContentHash)));
    return { questions, source: 'gemini+validated' };
  } catch {
    return null;
  }
}

/** AI questions carry the eq.ai rule tag — only those enter the pool. */
export function aiOnly(questions: Question[]): EquationQuestion[] {
  return questions.filter(
    (q): q is EquationQuestion => q.type === 'equations' && q.ruleTags.includes('eq.ai'),
  );
}
