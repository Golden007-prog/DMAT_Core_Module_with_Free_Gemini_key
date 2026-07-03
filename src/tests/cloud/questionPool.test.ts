import {
  questionContentHash,
  selectFreshQuestions,
} from '../../cloud/questionPool';
import { generateEquationQuestion } from '../../engine/equations/generator';
import { createPrng } from '../../engine/prng';
import type { Question } from '../../engine/types';

async function hashed(q: Question) {
  return { question: q, hash: await questionContentHash(q) };
}

describe('questionContentHash', () => {
  it('ignores ids, seeds, and equation order — same content, same hash', async () => {
    const q = generateEquationQuestion('medium', createPrng(42), 'choice');
    const clone = {
      ...q,
      id: crypto.randomUUID(),
      seed: 999,
      equationsDisplay: [...q.equationsDisplay].reverse(),
    };
    expect(await questionContentHash(clone)).toBe(await questionContentHash(q));
  });

  it('changes when the task content changes', async () => {
    const q = generateEquationQuestion('medium', createPrng(43), 'choice');
    const different = {
      ...q,
      solution: Object.fromEntries(
        Object.entries(q.solution).map(([k, v]) => [k, v === 20 ? 1 : v + 1]),
      ),
    };
    expect(await questionContentHash(different)).not.toBe(await questionContentHash(q));
  });
});

describe('selectFreshQuestions (serving-side no-repeat guarantee)', () => {
  it('skips seen and duplicate candidates and re-ids the served ones', async () => {
    const a = await hashed(generateEquationQuestion('easy', createPrng(1), 'choice'));
    const b = await hashed(generateEquationQuestion('easy', createPrng(2), 'choice'));
    const c = await hashed(generateEquationQuestion('easy', createPrng(3), 'choice'));
    const candidates = [a, { ...a }, b, c]; // a twice — pool client dedupes too

    const seen = new Set([b.hash]); // user already faced b
    const picked = selectFreshQuestions(candidates, seen, 2);

    expect(picked).toHaveLength(2);
    const pickedHashes = await Promise.all(picked.map(questionContentHash));
    expect(pickedHashes).toContain(a.hash);
    expect(pickedHashes).toContain(c.hash);
    expect(pickedHashes).not.toContain(b.hash);
    // fresh UUIDs so answers can never collide across sessions (R5)
    expect(picked.map((q) => q.id)).not.toContain(a.question.id);
  });

  it('drops invalid questions even if the pool row is corrupted', async () => {
    const good = await hashed(generateEquationQuestion('easy', createPrng(5), 'choice'));
    const corrupted = await hashed({
      ...generateEquationQuestion('easy', createPrng(6), 'choice'),
      equationsDisplay: ['A ** 2 = broken'],
    });
    const picked = selectFreshQuestions([corrupted, good], new Set(), 2);
    expect(picked).toHaveLength(1);
    expect(await questionContentHash(picked[0])).toBe(good.hash);
  });
});
