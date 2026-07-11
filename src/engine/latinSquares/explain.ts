import type { LatinLetter, LatinQuestion } from '../types';
import { glyphFor, type LatinAlphabetId } from './alphabets';
import { LETTERS, cloneGrid, type ChainStep, type Grid } from './solver';

/**
 * A forced deduction, stored as facts rather than prose: the rule, the evidence
 * that made it forced, and the conclusion. The letters stay internal A–E (old
 * sessions replay unchanged); the glyphs are substituted at render time, so the
 * explanation always speaks the alphabet the learner is actually looking at.
 */
export interface LatinExplainStep {
  row: number; // 0-based
  col: number;
  letter: LatinLetter;
  rule: 'elim' | 'hiddenRow' | 'hiddenCol';
  /** last step of the chain — this cell is the red "?" */
  isTarget: boolean;
  /** elim evidence: what the cell's row and column already showed at this point */
  rowSeen: LatinLetter[];
  colSeen: LatinLetter[];
  /** hidden-single evidence: the lines the letter was ruled out of — columns for
   *  hiddenRow, rows for hiddenCol (0-based). `blockedFilled` squares are already
   *  taken; `blockedByLine` squares are empty but their crossing line already
   *  carries the letter. Together they leave exactly one home. */
  blockedFilled: number[];
  blockedByLine: number[];
}

const RULE_LABEL: Record<LatinExplainStep['rule'], string> = {
  elim: 'row/column elimination',
  hiddenRow: 'hidden single in a row',
  hiddenCol: 'hidden single in a column',
};

function lettersInRow(grid: Grid, r: number): LatinLetter[] {
  return LETTERS.filter((l) => grid[r].includes(l));
}

function lettersInCol(grid: Grid, c: number): LatinLetter[] {
  return LETTERS.filter((l) => grid.some((row) => row[c] === l));
}

function explainOne(grid: Grid, step: ChainStep, isTarget: boolean): LatinExplainStep {
  const blockedFilled: number[] = [];
  const blockedByLine: number[] = [];

  if (step.rule === 'hiddenRow') {
    for (let c = 0; c < 5; c++) {
      if (c === step.col) continue;
      if (grid[step.row][c] !== null) blockedFilled.push(c);
      else if (lettersInCol(grid, c).includes(step.letter)) blockedByLine.push(c);
    }
  } else if (step.rule === 'hiddenCol') {
    for (let r = 0; r < 5; r++) {
      if (r === step.row) continue;
      if (grid[r][step.col] !== null) blockedFilled.push(r);
      else if (lettersInRow(grid, r).includes(step.letter)) blockedByLine.push(r);
    }
  }

  return {
    row: step.row,
    col: step.col,
    letter: step.letter,
    rule: step.rule,
    isTarget,
    rowSeen: lettersInRow(grid, step.row),
    colSeen: lettersInCol(grid, step.col),
    blockedFilled,
    blockedByLine,
  };
}

/** Walk the forced chain, snapshotting the evidence available at each step. */
export function buildExplainChain(grid: Grid, chain: ChainStep[]): LatinExplainStep[] {
  const walk = cloneGrid(grid);
  return chain.map((step, i) => {
    const explained = explainOne(walk, step, i === chain.length - 1);
    walk[step.row][step.col] = step.letter;
    return explained;
  });
}

/* -------------------------------- rendering ------------------------------- */

const cellRef = (row: number, col: number): string => `R${row + 1}C${col + 1}`;

function cellName(step: LatinExplainStep): string {
  const ref = cellRef(step.row, step.col);
  return step.isTarget ? `the "?" (${ref})` : ref;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function glyphList(letters: LatinLetter[], alphabet: LatinAlphabetId | undefined): string {
  return letters.map((l) => glyphFor(alphabet, l)).join(' ');
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** One deduction as a sentence: rule, the glyphs that prove it, conclusion. */
export function formatStep(step: LatinExplainStep, alphabet?: LatinAlphabetId): string {
  const glyph = glyphFor(alphabet, step.letter);
  const where = cellName(step);

  if (step.rule === 'elim') {
    // the column only ever *adds* what the row has not already ruled out
    const colOnly = step.colSeen.filter((l) => !step.rowSeen.includes(l));
    const clauses: string[] = [];
    if (step.rowSeen.length > 0) {
      clauses.push(`row ${step.row + 1} already shows ${glyphList(step.rowSeen, alphabet)}`);
    }
    if (colOnly.length > 0) {
      const verb = clauses.length > 0 ? 'adds' : 'already shows';
      clauses.push(`column ${step.col + 1} ${verb} ${glyphList(colOnly, alphabet)}`);
    }
    return `${upperFirst(clauses.join(', and '))} → the only symbol left for ${where} is ${glyph}.`;
  }

  const byRow = step.rule === 'hiddenRow';
  const line = byRow ? `Row ${step.row + 1}` : `Column ${step.col + 1}`;
  const cross = byRow ? 'column' : 'row';
  const home = byRow ? `column ${step.col + 1}` : `row ${step.row + 1}`;
  const label = (n: number) => (n === 1 ? cross : `${cross}s`);

  const clauses: string[] = [];
  if (step.blockedFilled.length > 0) {
    const n = step.blockedFilled.length;
    const list = joinList(step.blockedFilled.map((i) => String(i + 1)));
    clauses.push(`${label(n)} ${list} ${n === 1 ? 'is' : 'are'} already taken`);
  }
  if (step.blockedByLine.length > 0) {
    const n = step.blockedByLine.length;
    const list = joinList(step.blockedByLine.map((i) => String(i + 1)));
    clauses.push(`${label(n)} ${list} already ${n === 1 ? 'shows' : 'show'} a ${glyph} elsewhere`);
  }

  return `${line} still needs ${glyph}: ${clauses.join(', and ')} → it can only go in ${home}, so ${where} = ${glyph}.`;
}

/** One-line map of the solving path before the steps themselves. */
export function formatSummary(steps: LatinExplainStep[], alphabet?: LatinAlphabetId): string {
  if (steps.length === 0) return '';
  const rules = [...new Set(steps.map((s) => RULE_LABEL[s.rule]))].join(' + ');
  const answer = glyphFor(alphabet, steps[steps.length - 1].letter);
  if (steps.length === 1) {
    return `Depth 1 — one forced step (${rules}) settles the "?" at ${answer}.`;
  }
  const scaffold = joinList(steps.slice(0, -1).map((s) => cellRef(s.row, s.col)));
  return `Depth ${steps.length} — a ${steps.length}-step chain (${rules}): fill ${scaffold} first, then the "?" itself resolves to ${answer}.`;
}

/** Backwards compat: questions saved before `explainChain` existed carry prose
 *  written in the internal A–E letters. Swap the standalone letter tokens for
 *  the question's glyphs — the word boundaries keep "AND", "R3C2" and the like
 *  intact. */
export function glyphifyLegacyStep(text: string, alphabet?: LatinAlphabetId): string {
  if (!alphabet || alphabet === 'letters') return text;
  return text.replace(/\b[A-E]\b/g, (letter) => glyphFor(alphabet, letter as LatinLetter));
}

/** The explanation the learner reads: structured chain when the question has
 *  one, else the legacy strings mapped into the display alphabet. */
export function explainLatinQuestion(question: LatinQuestion): {
  summary: string;
  steps: string[];
} {
  const chain = question.explainChain;
  if (chain && chain.length > 0) {
    return {
      summary: formatSummary(chain, question.alphabet),
      steps: chain.map((step) => formatStep(step, question.alphabet)),
    };
  }
  return {
    summary: '',
    steps: question.explanationSteps.map((step) => glyphifyLegacyStep(step, question.alphabet)),
  };
}
