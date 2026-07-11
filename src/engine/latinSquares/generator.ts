import type { Difficulty, LatinLetter, LatinQuestion } from '../types';
import type { Prng } from '../prng';
import type { Grid, CellRef } from './solver';
import {
  LETTERS,
  cloneGrid,
  greedyChainSolvesTarget,
  minimalForcedChain,
  targetDirect,
} from './solver';
import { buildExplainChain, formatStep } from './explain';
import { LATIN_BANDS } from './difficulty';

/** Uniform-enough random 5×5 Latin square: cyclic base + row/col/letter shuffles. */
export function randomLatinSquare(prng: Prng): LatinLetter[][] {
  const rowPerm = prng.shuffle([0, 1, 2, 3, 4]);
  const colPerm = prng.shuffle([0, 1, 2, 3, 4]);
  const letterPerm = prng.shuffle(LETTERS);
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) => letterPerm[(rowPerm[r] + colPerm[c]) % 5]),
  );
}

function countGivens(grid: Grid): number {
  return grid.flat().filter((c) => c !== null).length;
}

export function generateLatinQuestion(difficulty: Difficulty, prng: Prng): LatinQuestion {
  const band = LATIN_BANDS[difficulty];
  const seed = prng.int(0, 2 ** 31 - 1);

  for (let attempt = 0; attempt < 100; attempt++) {
    const square = randomLatinSquare(prng);
    const target: CellRef = { row: prng.int(0, 4), col: prng.int(0, 4) };
    const solutionLetter = square[target.row][target.col];

    const grid: Grid = cloneGrid(square);
    grid[target.row][target.col] = null;

    // Removal order: for easy, protect the target's row/col so direct
    // elimination survives; for medium/hard, attack them first so the solver
    // is forced through intermediate deductions.
    const inLine: CellRef[] = [];
    const offLine: CellRef[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === target.row && c === target.col) continue;
        (r === target.row || c === target.col ? inLine : offLine).push({ row: r, col: c });
      }
    }
    const order =
      difficulty === 'easy'
        ? [...prng.shuffle(offLine), ...prng.shuffle(inLine)]
        : [...prng.shuffle(inLine), ...prng.shuffle(offLine)];

    let accepted: { depth: number; chain: NonNullable<ReturnType<typeof minimalForcedChain>> } | null =
      null;

    for (const cell of order) {
      const givens = countGivens(grid);
      if (givens <= band.minGivens) break;

      const kept = grid[cell.row][cell.col];
      if (kept === null) continue;
      grid[cell.row][cell.col] = null;

      let ok = greedyChainSolvesTarget(grid, target);
      if (ok && difficulty === 'easy') ok = targetDirect(grid, target);
      if (!ok) {
        grid[cell.row][cell.col] = kept;
        continue;
      }

      const newGivens = givens - 1;
      if (newGivens <= band.maxGivens) {
        // inside (or approaching) the band → measure the true minimal chain
        const chain = minimalForcedChain(grid, target);
        if (chain && chain.length >= band.minDepth && chain.length <= band.maxDepth) {
          accepted = { depth: chain.length, chain };
          break;
        }
        // depth still too low and room to keep removing → continue loop
        if (chain && chain.length < band.minDepth && newGivens > band.minGivens) continue;
        // depth overshot the band → this removal went too far; undo and try another cell
        if (!chain || chain.length > band.maxDepth) {
          grid[cell.row][cell.col] = kept;
          continue;
        }
      }
    }

    if (!accepted) continue;

    // The chain is stored as facts; the display alphabet is only chosen later
    // (generateSet), so the string form is baked in the internal letters and the
    // renderer re-formats explainChain in whatever alphabet the learner sees.
    const explainChain = buildExplainChain(grid, accepted.chain);
    const explanationSteps = explainChain.map((step) => formatStep(step, 'letters'));

    const givens = countGivens(grid);
    const ruleTags = [
      accepted.depth === 1 ? 'lat.direct' : accepted.depth <= 3 ? 'lat.chain2' : 'lat.chain4plus',
      ...(accepted.chain.some((s) => s.rule === 'hiddenRow') ? ['lat.hiddenSingle.row'] : []),
      ...(accepted.chain.some((s) => s.rule === 'hiddenCol') ? ['lat.hiddenSingle.col'] : []),
      ...(givens <= 11 ? ['lat.clues.sparse'] : []),
    ];

    return {
      id: crypto.randomUUID(),
      type: 'latin',
      difficulty,
      seed,
      ruleTags,
      grid,
      question: target,
      solutionLetter,
      inferenceDepth: accepted.depth,
      explanationSteps,
      explainChain,
    };
  }
  throw new Error(`latin generation exhausted retries (${difficulty})`);
}
