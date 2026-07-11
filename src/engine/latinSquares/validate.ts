import type { LatinQuestion, ValidationResult } from '../types';
import { LETTERS, minimalForcedChain, targetLettersAcrossCompletions } from './solver';
import { LATIN_BANDS } from './difficulty';

export function validateLatinQuestion(q: LatinQuestion): ValidationResult {
  const reasons: string[] = [];

  if (q.grid.length !== 5 || q.grid.some((r) => r.length !== 5)) {
    reasons.push('grid is not 5×5');
    return { ok: false, reasons };
  }
  for (const row of q.grid) {
    for (const cell of row) {
      if (cell !== null && !LETTERS.includes(cell)) {
        reasons.push(`illegal cell value ${String(cell)}`);
      }
    }
  }

  const { row, col } = q.question;
  if (row < 0 || row > 4 || col < 0 || col > 4) reasons.push('"?" cell out of bounds');
  else if (q.grid[row][col] !== null) reasons.push('"?" cell is not empty');

  // Latin property of the givens: no letter twice in a row or column
  for (let r = 0; r < 5; r++) {
    const seen = q.grid[r].filter((c) => c !== null);
    if (new Set(seen).size !== seen.length) reasons.push(`duplicate letter in row ${r + 1}`);
  }
  for (let c = 0; c < 5; c++) {
    const seen = q.grid.map((r) => r[c]).filter((v) => v !== null);
    if (new Set(seen).size !== seen.length) reasons.push(`duplicate letter in column ${c + 1}`);
  }

  if (reasons.length > 0) return { ok: false, reasons };

  const letters = targetLettersAcrossCompletions(q.grid, q.question);
  if (letters.size === 0) reasons.push('givens admit no completion');
  else if (letters.size > 1) reasons.push('"?" is not uniquely forced across completions');
  else if (!letters.has(q.solutionLetter)) {
    reasons.push(`stated solution ${q.solutionLetter} but completions force ${[...letters][0]}`);
  }

  const chain = minimalForcedChain(q.grid, q.question);
  if (!chain) {
    reasons.push('not solvable by elimination + hidden singles (needs backtracking)');
  } else {
    if (chain.length !== q.inferenceDepth) {
      reasons.push(`stated depth ${q.inferenceDepth} but minimal chain is ${chain.length}`);
    }
    const band = LATIN_BANDS[q.difficulty];
    if (chain.length < band.minDepth || chain.length > band.maxDepth) {
      reasons.push(`depth ${chain.length} outside ${q.difficulty} band`);
    }
    const givens = q.grid.flat().filter((c) => c !== null).length;
    if (givens < band.minGivens || givens > band.maxGivens) {
      reasons.push(`givens ${givens} outside ${q.difficulty} band`);
    }
  }

  if (q.explanationSteps.length === 0) reasons.push('missing explanation steps');

  // optional (absent on pre-explainChain sessions); when present it is what the
  // learner actually reads, so it must land on the "?" with the stated letter
  if (q.explainChain) {
    if (q.explainChain.length !== q.explanationSteps.length) {
      reasons.push('explainChain and explanationSteps disagree in length');
    }
    const last = q.explainChain[q.explainChain.length - 1];
    if (
      !last ||
      last.row !== q.question.row ||
      last.col !== q.question.col ||
      last.letter !== q.solutionLetter
    ) {
      reasons.push('explainChain does not end on the "?" cell with the solution letter');
    }
  }

  return { ok: reasons.length === 0, reasons };
}
