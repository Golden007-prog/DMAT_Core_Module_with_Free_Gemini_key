import type { Question } from '../engine/types';
import type { GenerateSetConfig } from '../engine/generateSet';
import { supabase } from './supabaseClient';
import { useAuth } from './authStore';

export function setCacheKey(cfg: GenerateSetConfig): string {
  return `${cfg.subtest}:${cfg.difficulty}:${cfg.count}:${cfg.seed}:${cfg.equationAskMode ?? 'choice'}`;
}

/** Stores a generated set so retries and other devices load it instantly —
 *  essential for AI-generated sets, which cannot be regenerated from a seed. */
export async function pushGeneratedSet(
  cfg: GenerateSetConfig,
  questions: Question[],
  source: string,
): Promise<void> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return;
  await supabase.from('generated_sets').upsert({
    user_id: user.id,
    cache_key: setCacheKey(cfg),
    questions,
    source,
  });
}

export interface CachedSet {
  questions: Question[];
  source: string;
}

/** Cache lookup with a hard time budget — generation must never wait on the
 *  network longer than this; a miss falls back to local generation. */
export async function fetchCachedSet(
  cfg: GenerateSetConfig,
  timeoutMs = 1500,
): Promise<CachedSet | null> {
  const user = useAuth.getState().user;
  if (!supabase || !user) return null;
  try {
    const query = supabase
      .from('generated_sets')
      .select('questions, source')
      .eq('user_id', user.id)
      .eq('cache_key', setCacheKey(cfg))
      .maybeSingle();
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
    const result = await Promise.race([query, timeout]);
    if (!result || result.error || !result.data) return null;
    const questions = result.data.questions as Question[];
    if (!Array.isArray(questions) || questions.length !== cfg.count) return null;
    return { questions, source: (result.data.source as string) ?? 'deterministic' };
  } catch {
    return null;
  }
}
