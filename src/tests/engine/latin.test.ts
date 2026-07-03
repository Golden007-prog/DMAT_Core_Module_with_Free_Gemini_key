import { createPrng } from '../../engine/prng';
import { generateLatinQuestion } from '../../engine/latinSquares/generator';
import { validateLatinQuestion } from '../../engine/latinSquares/validate';
import {
  minimalForcedChain,
  targetLettersAcrossCompletions,
} from '../../engine/latinSquares/solver';
import { LATIN_BANDS } from '../../engine/latinSquares/difficulty';
import type { Difficulty, LatinLetter } from '../../engine/types';

type Cell = LatinLetter | null;
const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

function emptyGrid(): Cell[][] {
  return Array.from({ length: 5 }, () => Array<Cell>(5).fill(null));
}

describe('latin solver primitives', () => {
  it('solves a direct-elimination target in one step', () => {
    const g = emptyGrid();
    g[0][0] = 'A';
    g[0][1] = 'B';
    g[0][2] = 'C';
    g[0][3] = 'D';
    const chain = minimalForcedChain(g, { row: 0, col: 4 });
    expect(chain).not.toBeNull();
    expect(chain!.length).toBe(1);
    expect(chain![0].letter).toBe('E');
    expect(chain![0].rule).toBe('elim');
  });

  it('solves a hidden-single target', () => {
    const g = emptyGrid();
    // A pinned to (0,0) because columns 1..4 all contain A elsewhere
    g[1][1] = 'A';
    g[2][2] = 'A';
    g[3][3] = 'A';
    g[4][4] = 'A';
    const chain = minimalForcedChain(g, { row: 0, col: 0 });
    expect(chain).not.toBeNull();
    expect(chain!.length).toBe(1);
    expect(chain![0].letter).toBe('A');
    expect(chain![0].rule).toMatch(/hidden/);
  });

  it('finds a two-step chain through an intermediate cell', () => {
    const g = emptyGrid();
    g[0][1] = 'D';
    g[0][2] = 'C';
    g[1][1] = 'A';
    g[2][3] = 'B';
    g[2][4] = 'C';
    g[3][2] = 'A';
    g[4][0] = 'B';
    const chain = minimalForcedChain(g, { row: 0, col: 0 });
    expect(chain).not.toBeNull();
    expect(chain!.length).toBe(2);
    expect(chain![1].letter).toBe('E');
  });

  it('reports ambiguity when completions disagree on the target', () => {
    const g = emptyGrid();
    g[1][1] = 'A';
    const letters = targetLettersAcrossCompletions(g, { row: 0, col: 0 });
    expect(letters.size).toBeGreaterThan(1);
  });

  it('agrees on a forced target even when the rest of the grid is ambiguous', () => {
    const g = emptyGrid();
    g[0][0] = 'A';
    g[0][1] = 'B';
    g[0][2] = 'C';
    g[0][3] = 'D';
    const letters = targetLettersAcrossCompletions(g, { row: 0, col: 4 });
    expect([...letters]).toEqual(['E']);
  });
});

describe('generateLatinQuestion', () => {
  it('is deterministic for a given seed', () => {
    const q1 = generateLatinQuestion('medium', createPrng(777));
    const q2 = generateLatinQuestion('medium', createPrng(777));
    expect(q1.grid).toEqual(q2.grid);
    expect(q1.question).toEqual(q2.question);
    expect(q1.solutionLetter).toBe(q2.solutionLetter);
  });

  it.each(DIFFS)(
    '%s: 1000 seeds → all pass the validator',
    (diff) => {
      for (let seed = 1; seed <= 1000; seed++) {
        const q = generateLatinQuestion(diff, createPrng(seed));
        const res = validateLatinQuestion(q);
        if (!res.ok) {
          throw new Error(`seed ${seed} (${diff}) failed: ${res.reasons.join('; ')}`);
        }
      }
    },
    120_000, // heavy property suite — slow CI runners need headroom
  );

  it.each(DIFFS)('%s: clue count and inference depth stay in band', (diff) => {
    const band = LATIN_BANDS[diff];
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateLatinQuestion(diff, createPrng(seed));
      const givens = q.grid.flat().filter((c) => c !== null).length;
      expect(givens, `seed ${seed} givens`).toBeGreaterThanOrEqual(band.minGivens);
      expect(givens, `seed ${seed} givens`).toBeLessThanOrEqual(band.maxGivens);
      expect(q.inferenceDepth, `seed ${seed} depth`).toBeGreaterThanOrEqual(band.minDepth);
      expect(q.inferenceDepth, `seed ${seed} depth`).toBeLessThanOrEqual(band.maxDepth);
      expect(q.explanationSteps).toHaveLength(q.inferenceDepth);
    }
  }, 60_000);

  it('the "?" cell is empty and inside the grid', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateLatinQuestion('easy', createPrng(seed));
      expect(q.grid[q.question.row][q.question.col]).toBeNull();
    }
  });
});

describe('validateLatinQuestion', () => {
  it('rejects a grid whose "?" admits two letters', () => {
    const q = generateLatinQuestion('easy', createPrng(5));
    const sparse = emptyGrid();
    sparse[1][1] = 'A';
    const bad = { ...q, grid: sparse, question: { row: 0, col: 0 } };
    expect(validateLatinQuestion(bad).ok).toBe(false);
  });

  it('rejects duplicate letters in a row of givens', () => {
    const q = generateLatinQuestion('easy', createPrng(6));
    const grid = q.grid.map((r) => [...r]);
    // force a duplicate into some row
    grid[0][0] = 'A';
    grid[0][1] = 'A';
    const bad = { ...q, grid };
    expect(validateLatinQuestion(bad).ok).toBe(false);
  });

  it('rejects a wrong solution letter', () => {
    const q = generateLatinQuestion('easy', createPrng(7));
    const wrong = (['A', 'B', 'C', 'D', 'E'] as const).find((l) => l !== q.solutionLetter)!;
    expect(validateLatinQuestion({ ...q, solutionLetter: wrong }).ok).toBe(false);
  });

  it('rejects a misstated inference depth', () => {
    const q = generateLatinQuestion('medium', createPrng(8));
    expect(validateLatinQuestion({ ...q, inferenceDepth: q.inferenceDepth + 5 }).ok).toBe(false);
  });
});
