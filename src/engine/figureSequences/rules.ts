import type {
  ColorKind,
  Frame,
  MovementRule,
  RotationRule,
  ShapeKind,
  SymbolProgram,
} from '../types';
import { ringIndexOf, stepSymbol, type Pos, type SymbolState } from './simulate';

export const ALL_SHAPES: ShapeKind[] = [
  'cross',
  'triangle',
  'square',
  'circle',
  'halfCircle',
  'halfSquare',
  'tShape',
  'lShape',
  'plus',
  'star',
  'diamond',
  'hourglass',
];

/** Shapes whose four 90° rotations are visually distinct — only these may
 *  carry rotation rules, otherwise the rule would be invisible/ambiguous. */
export const ROTATABLE_SHAPES: ShapeKind[] = [
  'triangle',
  'halfCircle',
  'halfSquare',
  'tShape',
  'lShape',
];

export const SYMBOL_COLORS: ColorKind[] = [
  'black',
  'pink',
  'yellow',
  'orange',
  'green',
  'blue',
  'white',
];

export const AXIS_DIRS: Array<{ dr: -1 | 0 | 1; dc: -1 | 0 | 1 }> = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];

export const DIAG_DIRS: Array<{ dr: -1 | 0 | 1; dc: -1 | 0 | 1 }> = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
];

const L = { dr: 0 as const, dc: -1 as const };
const R = { dr: 0 as const, dc: 1 as const };
const U = { dr: -1 as const, dc: 0 as const };
const D = { dr: 1 as const, dc: 0 as const };

/** The direction-cycle catalog the generator draws from (e.g. left, up, right, down, …). */
export const DIRECTION_CYCLES: Array<Array<{ dr: -1 | 0 | 1; dc: -1 | 0 | 1 }>> = [
  [L, U, R, D],
  [U, R, D, L],
  [R, D, L, U],
  [D, L, U, R],
  [L, D, R, U],
  [D, R, U, L],
  [R, U, L, D],
  [U, L, D, R],
];

/** Rotations that look identical for a shape are collapsed to a canonical value. */
export function visualRotation(shape: ShapeKind, rotation: number): number {
  if (ROTATABLE_SHAPES.includes(shape)) return ((rotation % 360) + 360) % 360;
  if (shape === 'hourglass') return ((rotation % 180) + 180) % 180;
  return 0; // fully 90°-symmetric shapes
}

/* ------------------------------- inferability ----------------------------- */

function movementCandidates(start: Pos): Array<{ rule: MovementRule; state: SymbolState }> {
  const out: Array<{ rule: MovementRule; state: SymbolState }> = [];
  out.push({ rule: { kind: 'static' }, state: { dr: 0, dc: 0, ringIdx: 0 } });

  const steps: Array<1 | 2 | 'x+1'> = [1, 2, 'x+1'];
  for (const dir of AXIS_DIRS) {
    for (const step of steps) {
      out.push({
        rule: { kind: 'axis-bounce', ...dir, step, boundary: 'bounce' },
        state: { dr: dir.dr, dc: dir.dc, ringIdx: 0 },
      });
    }
  }
  for (const dir of DIAG_DIRS) {
    for (const step of steps) {
      for (const boundary of ['bounce', 'slide'] as const) {
        out.push({
          rule: { kind: 'axis-bounce', ...dir, step, boundary },
          state: { dr: dir.dr, dc: dir.dc, ringIdx: 0 },
        });
      }
    }
  }
  const ringIdx = ringIndexOf(start.row, start.col);
  if (ringIdx !== -1) {
    for (const dir of ['cw', 'ccw'] as const) {
      for (const step of steps) {
        out.push({ rule: { kind: 'perimeter', dir, step }, state: { dr: 0, dc: 0, ringIdx } });
      }
    }
  }
  for (const dirs of DIRECTION_CYCLES) {
    out.push({ rule: { kind: 'direction-cycle', dirs }, state: { dr: 0, dc: 0, ringIdx: 0 } });
  }
  return out;
}

/** Simulate a lone movement candidate; null when it walks off-grid. */
function candidatePositions(
  rule: MovementRule,
  state: SymbolState,
  start: Pos,
  frameCount: number,
): Pos[] | null {
  const positions: Pos[] = [start];
  let pos = start;
  let st = state;
  for (let t = 1; t < frameCount; t++) {
    const step = stepSymbol(rule, pos, st, t);
    if (!step) return null;
    pos = step.pos;
    st = step.state;
    positions.push(pos);
  }
  return positions;
}

/**
 * §5.1 quality gate: the pattern must be inferable from frames 1–4 alone.
 * For every symbol, every rule in the official rule space that is consistent
 * with the four visible frames must predict the same frames 5 and 6 —
 * otherwise the task has no single defensible answer and is resampled.
 */
export function isInferable(programs: SymbolProgram[], frames: Frame[]): boolean {
  for (const program of programs) {
    const observed = frames.map((f) => f.find((s) => s.symbolId === program.symbolId)!);

    // movement
    const start = { row: observed[0].row, col: observed[0].col };
    const truth = observed.map((o) => `${o.row},${o.col}`);
    let agreed: string[] | null = null;
    for (const cand of movementCandidates(start)) {
      const pos = candidatePositions(cand.rule, cand.state, start, 6);
      if (!pos) continue; // illegal continuation → user can eliminate it
      const key = pos.map((p) => `${p.row},${p.col}`);
      const consistent = key[1] === truth[1] && key[2] === truth[2] && key[3] === truth[3];
      if (!consistent) continue;
      const prediction = `${key[4]}|${key[5]}`;
      if (agreed === null) agreed = [prediction];
      else if (!agreed.includes(prediction)) return false;
    }

    // rotation (visual)
    const vrot = observed.map((o) => visualRotation(program.shape, o.rotation));
    const rotCandidates: Array<RotationRule | null> = [
      null,
      { dir: 'cw', count: 1 },
      { dir: 'ccw', count: 1 },
      { dir: 'cw', count: 'x+1' },
      { dir: 'ccw', count: 'x+1' },
    ];
    let rotAgreed: string | null = null;
    for (const cand of rotCandidates) {
      const seq: number[] = [vrot[0]];
      let raw = observed[0].rotation as number;
      for (let t = 1; t <= 5; t++) {
        if (cand) {
          const count = cand.count === 'x+1' ? t : cand.count;
          raw = ((raw + (cand.dir === 'cw' ? 1 : -1) * 90 * count) % 360 + 360) % 360;
        }
        seq.push(visualRotation(program.shape, raw));
      }
      const consistent = seq[1] === vrot[1] && seq[2] === vrot[2] && seq[3] === vrot[3];
      if (!consistent) continue;
      const prediction = `${seq[4]}|${seq[5]}`;
      if (rotAgreed === null) rotAgreed = prediction;
      else if (rotAgreed !== prediction) return false;
    }

    // colour
    const colors = observed.map((o) => o.color);
    const colorCycles: ColorKind[][] = [[colors[0]]];
    for (const x of SYMBOL_COLORS) {
      if (x !== colors[0]) colorCycles.push([colors[0], x]);
      for (const y of SYMBOL_COLORS) {
        if (x !== colors[0] && y !== colors[0] && x !== y) colorCycles.push([colors[0], x, y]);
      }
    }
    let colorAgreed: string | null = null;
    for (const cycle of colorCycles) {
      const seq = Array.from({ length: 6 }, (_, i) => cycle[i % cycle.length]);
      const consistent = seq[1] === colors[1] && seq[2] === colors[2] && seq[3] === colors[3];
      if (!consistent) continue;
      const prediction = `${seq[4]}|${seq[5]}`;
      if (colorAgreed === null) colorAgreed = prediction;
      else if (colorAgreed !== prediction) return false;
    }
  }
  return true;
}
