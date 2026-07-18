import type {
  Difficulty,
  GamPassage,
  GamPassageDoc,
  GamQuestion,
  GamTopicArea,
} from '../types';
import { createPrng, deriveSeed } from '../prng';

/** Exam blueprint — g.a.s.t. does not publish the exact passage/question
 *  count, so these are modeled on the official samples and labeled as such
 *  in the UI. Single source of truth for every GAM mode. */
export const GAM_EXAM = {
  durationMs: 90 * 60_000, // official: 90 minutes for the whole module
  passageCount: 5,
  minQuestions: 24,
  maxQuestions: 34,
} as const;

/** Practice pacing: ~2.7 min per question including passage reading time —
 *  the exam works out to roughly this budget. */
export const GAM_MS_PER_QUESTION = 160_000;

export interface GamAssembleConfig {
  seed: number;
  /** passages to draw; questions come whole-passage, never partial */
  passageCount: number;
  /** filter — undefined/empty = all eight areas */
  topicAreas?: GamTopicArea[];
  difficulty?: Difficulty | 'mixed';
}

export interface AssembledGamSet {
  passages: GamPassageDoc[];
  questions: GamQuestion[];
}

function toDoc(p: GamPassage): GamPassageDoc {
  const { questions: _questions, ...doc } = p;
  return doc;
}

/** Per-session option shuffle: same stem must not always carry the answer in
 *  the same slot across sessions. Deterministic from (seed, passage, question);
 *  authored order is kept when the wording is order-dependent. */
function shuffleOptions(q: GamQuestion, seed: number, pIdx: number, qIdx: number): GamQuestion {
  if (q.lockOptionOrder) return q;
  const prng = createPrng(deriveSeed(deriveSeed(seed, pIdx * 131 + qIdx), 0x6a3));
  const order = prng.shuffle([0, 1, 2, 3] as const);
  const options = order.map((i) => q.options[i]) as [string, string, string, string];
  const correct = order.indexOf(q.correct) as 0 | 1 | 2 | 3;
  return { ...q, options, correct, seed };
}

/** Deterministic, seeded passage draw with balanced topic-area spread:
 *  areas rotate round-robin (seed-shuffled rotation), passages draw randomly
 *  within an area, and no passage repeats. Pure in (cfg, bank). */
export function assembleGamSet(cfg: GamAssembleConfig, bank: GamPassage[]): AssembledGamSet {
  const prng = createPrng(deriveSeed(cfg.seed, 0x9a7));
  const areaFilter =
    cfg.topicAreas && cfg.topicAreas.length > 0 ? new Set(cfg.topicAreas) : null;

  const candidates = bank
    .filter((p) => (areaFilter ? areaFilter.has(p.topicArea) : true))
    .filter((p) =>
      !cfg.difficulty || cfg.difficulty === 'mixed' ? true : p.difficulty === cfg.difficulty,
    )
    // stable order regardless of bank file/load order → same seed, same set
    .sort((a, b) => a.id.localeCompare(b.id));

  if (candidates.length === 0) {
    throw new Error('gam assembly: no passages match the requested filter');
  }

  const byArea = new Map<GamTopicArea, GamPassage[]>();
  for (const p of candidates) {
    const list = byArea.get(p.topicArea) ?? [];
    list.push(p);
    byArea.set(p.topicArea, list);
  }
  const areaRotation = prng.shuffle([...byArea.keys()]);

  const picked: GamPassage[] = [];
  const want = Math.min(cfg.passageCount, candidates.length);
  let rotationIdx = 0;
  while (picked.length < want) {
    const area = areaRotation[rotationIdx % areaRotation.length];
    rotationIdx++;
    const pool = byArea.get(area)!;
    if (pool.length > 0) {
      const idx = prng.int(0, pool.length - 1);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    if ([...byArea.values()].every((l) => l.length === 0)) break;
  }

  const questions = picked.flatMap((p, pIdx) =>
    p.questions.map((q, qIdx) => shuffleOptions(q, cfg.seed, pIdx, qIdx)),
  );

  return { passages: picked.map(toDoc), questions };
}

/** The full 90-minute exam draw: balanced across all areas, question total
 *  nudged into the blueprint band by swapping the longest passage for a
 *  shorter same-area alternative when the draw runs over. */
export function assembleGamExam(seed: number, bank: GamPassage[]): AssembledGamSet {
  const first = assembleGamSet(
    { seed, passageCount: GAM_EXAM.passageCount, difficulty: 'mixed' },
    bank,
  );
  let total = first.questions.length;
  if (total <= GAM_EXAM.maxQuestions) return first;

  // over budget: deterministically swap largest picked passages for smaller
  // unpicked same-area ones until inside the band (or no swap helps)
  const pickedIds = new Set(first.passages.map((p) => p.id));
  const picked = bank
    .filter((p) => pickedIds.has(p.id))
    .sort((a, b) => b.questions.length - a.questions.length);
  const replacements = new Map<string, GamPassage>();

  for (const big of picked) {
    if (total <= GAM_EXAM.maxQuestions) break;
    const alt = bank
      .filter(
        (p) =>
          p.topicArea === big.topicArea &&
          !pickedIds.has(p.id) &&
          p.questions.length < big.questions.length,
      )
      .sort((a, b) => a.questions.length - b.questions.length)[0];
    if (alt) {
      replacements.set(big.id, alt);
      pickedIds.delete(big.id);
      pickedIds.add(alt.id);
      total -= big.questions.length - alt.questions.length;
    }
  }
  if (replacements.size === 0) return first;

  const finalPassages = first.passages.map((doc) => {
    const swap = replacements.get(doc.id);
    return swap ?? bank.find((p) => p.id === doc.id)!;
  });
  const questions = finalPassages.flatMap((p, pIdx) =>
    p.questions.map((q, qIdx) => shuffleOptions(q, seed, pIdx, qIdx)),
  );
  return { passages: finalPassages.map(toDoc), questions };
}
