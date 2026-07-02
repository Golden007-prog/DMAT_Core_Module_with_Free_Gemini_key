import type { LatinLetter } from '../types';

export const LETTERS: LatinLetter[] = ['A', 'B', 'C', 'D', 'E'];
type Cell = LatinLetter | null;
export type Grid = Cell[][];

export interface ChainStep {
  row: number;
  col: number;
  letter: LatinLetter;
  rule: 'elim' | 'hiddenRow' | 'hiddenCol';
}

export interface CellRef {
  row: number;
  col: number;
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((r) => [...r]);
}

function rowLetters(grid: Grid, r: number): Set<LatinLetter> {
  const s = new Set<LatinLetter>();
  for (let c = 0; c < 5; c++) {
    const v = grid[r][c];
    if (v) s.add(v);
  }
  return s;
}

function colLetters(grid: Grid, c: number): Set<LatinLetter> {
  const s = new Set<LatinLetter>();
  for (let r = 0; r < 5; r++) {
    const v = grid[r][c];
    if (v) s.add(v);
  }
  return s;
}

function candidates(grid: Grid, r: number, c: number): LatinLetter[] {
  const used = rowLetters(grid, r);
  for (const l of colLetters(grid, c)) used.add(l);
  return LETTERS.filter((l) => !used.has(l));
}

/**
 * All human-style forced moves available in the current grid, using ONLY the
 * two official inference rules (§3.3): (a) row∪column elimination on a cell,
 * (b) hidden singles in a row or column.
 */
export function forcedMoves(grid: Grid): ChainStep[] {
  const moves: ChainStep[] = [];
  const seen = new Set<string>();
  const push = (m: ChainStep) => {
    const key = `${m.row},${m.col}`;
    if (!seen.has(key)) {
      seen.add(key);
      moves.push(m);
    }
  };

  // (a) naked single via row∪col elimination
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (grid[r][c] !== null) continue;
      const cand = candidates(grid, r, c);
      if (cand.length === 1) push({ row: r, col: c, letter: cand[0], rule: 'elim' });
    }
  }

  // (b) hidden single in a row
  for (let r = 0; r < 5; r++) {
    const present = rowLetters(grid, r);
    for (const letter of LETTERS) {
      if (present.has(letter)) continue;
      const fits: number[] = [];
      for (let c = 0; c < 5; c++) {
        if (grid[r][c] === null && !colLetters(grid, c).has(letter)) fits.push(c);
      }
      if (fits.length === 1) push({ row: r, col: fits[0], letter, rule: 'hiddenRow' });
    }
  }

  // (b) hidden single in a column
  for (let c = 0; c < 5; c++) {
    const present = colLetters(grid, c);
    for (const letter of LETTERS) {
      if (present.has(letter)) continue;
      const fits: number[] = [];
      for (let r = 0; r < 5; r++) {
        if (grid[r][c] === null && !rowLetters(grid, r).has(letter)) fits.push(r);
      }
      if (fits.length === 1) push({ row: fits[0], col: c, letter, rule: 'hiddenCol' });
    }
  }

  return moves;
}

/** Fast check: can the chain solver (fixpoint of forced moves) resolve the target? */
export function greedyChainSolvesTarget(grid: Grid, target: CellRef): boolean {
  const g = cloneGrid(grid);
  for (let guard = 0; guard < 26; guard++) {
    if (g[target.row][target.col] !== null) return true;
    const moves = forcedMoves(g);
    if (moves.length === 0) return false;
    for (const m of moves) {
      if (g[m.row][m.col] === null) g[m.row][m.col] = m.letter;
    }
  }
  return g[target.row][target.col] !== null;
}

/** Is the target directly resolvable (its row∪col already shows the other 4 letters)? */
export function targetDirect(grid: Grid, target: CellRef): boolean {
  return candidates(grid, target.row, target.col).length === 1;
}

function gridKey(g: Grid): string {
  return g.map((row) => row.map((c) => c ?? '.').join('')).join('');
}

/**
 * Minimal forced-move chain ending with the target cell (BFS over grids).
 * Returns the shortest sequence of forced fills whose last step fills the "?",
 * or null when the puzzle is not solvable by the two official rules alone.
 * Depth == returned length (easy = 1, medium = 2–3, hard = 4+, per §3.3).
 */
export function minimalForcedChain(
  grid: Grid,
  target: CellRef,
  maxDepth = 10,
): ChainStep[] | null {
  interface Node {
    grid: Grid;
    path: ChainStep[];
  }
  let frontier: Node[] = [{ grid: cloneGrid(grid), path: [] }];
  const visited = new Set<string>([gridKey(grid)]);

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const move of forcedMoves(node.grid)) {
        if (move.row === target.row && move.col === target.col) {
          return [...node.path, move];
        }
        const g = cloneGrid(node.grid);
        g[move.row][move.col] = move.letter;
        const key = gridKey(g);
        if (!visited.has(key)) {
          visited.add(key);
          next.push({ grid: g, path: [...node.path, move] });
        }
      }
    }
    if (next.length === 0) return null;
    frontier = next;
  }
  return null;
}

/**
 * Letters the target cell takes across ALL valid completions of the givens
 * (backtracking, early exit once two distinct letters are seen). A valid
 * question requires exactly one letter here even if the rest of the grid
 * admits several completions.
 */
export function targetLettersAcrossCompletions(
  grid: Grid,
  target: CellRef,
): Set<LatinLetter> {
  const found = new Set<LatinLetter>();
  const g = cloneGrid(grid);

  function solve(): boolean {
    // returns true to abort (two letters found)
    let best: { r: number; c: number; cand: LatinLetter[] } | null = null;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] !== null) continue;
        const cand = candidates(g, r, c);
        if (cand.length === 0) return false;
        if (!best || cand.length < best.cand.length) best = { r, c, cand };
      }
    }
    if (!best) {
      found.add(g[target.row][target.col]!);
      return found.size >= 2;
    }
    for (const letter of best.cand) {
      g[best.r][best.c] = letter;
      const abort = solve();
      g[best.r][best.c] = null;
      if (abort) return true;
    }
    return false;
  }

  solve();
  return found;
}

/** Human-readable explanation for one chain step. */
export function describeStep(grid: Grid, step: ChainStep, isTarget: boolean): string {
  const cell = isTarget ? '?' : `cell (${step.row + 1},${step.col + 1})`;
  if (step.rule === 'elim') {
    const used = [...rowLetters(grid, step.row)];
    for (const l of colLetters(grid, step.col)) if (!used.includes(l)) used.push(l);
    used.sort();
    return `Row ${step.row + 1} and column ${step.col + 1} already show ${used.join(', ')} → ${cell} = ${step.letter}.`;
  }
  if (step.rule === 'hiddenRow') {
    return `In row ${step.row + 1}, ${step.letter} fits only in column ${step.col + 1} → ${cell} = ${step.letter}.`;
  }
  return `In column ${step.col + 1}, ${step.letter} fits only in row ${step.row + 1} → ${cell} = ${step.letter}.`;
}
