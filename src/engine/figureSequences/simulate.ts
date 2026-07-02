import type { Frame, GridIndex, MovementRule, PlacedSymbol, SymbolProgram } from '../types';

/** Border cells of the 4×4 grid in clockwise order starting at the top-left. */
export const PERIMETER_RING: ReadonlyArray<{ row: GridIndex; col: GridIndex }> = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 0, col: 3 },
  { row: 1, col: 3 },
  { row: 2, col: 3 },
  { row: 3, col: 3 },
  { row: 3, col: 2 },
  { row: 3, col: 1 },
  { row: 3, col: 0 },
  { row: 2, col: 0 },
  { row: 1, col: 0 },
];

export function ringIndexOf(row: number, col: number): number {
  return PERIMETER_RING.findIndex((p) => p.row === row && p.col === col);
}

export interface SymbolState {
  /** live direction for axis-bounce movers (mutated by reflections) */
  dr: number;
  dc: number;
  /** ring position for perimeter movers */
  ringIdx: number;
}

export interface Pos {
  row: number;
  col: number;
}

const inGrid = (r: number, c: number) => r >= 0 && r <= 3 && c >= 0 && c <= 3;

/**
 * Advances one symbol through transition `t` (1-based). `stepOverride` lets
 * distractor builders replay a transition one step short / one step long.
 * Returns null when the move is illegal (a direction-cycle walking off-grid).
 */
export function stepSymbol(
  movement: MovementRule,
  pos: Pos,
  state: SymbolState,
  t: number,
  stepOverride?: number,
): { pos: Pos; state: SymbolState } | null {
  let { row, col } = pos;
  const st = { ...state };

  switch (movement.kind) {
    case 'static':
      break;

    case 'axis-bounce': {
      const steps = stepOverride ?? (movement.step === 'x+1' ? t : movement.step);
      for (let i = 0; i < steps; i++) {
        let nr = row + st.dr;
        let nc = col + st.dc;
        if (movement.boundary === 'bounce') {
          if (nr < 0 || nr > 3) st.dr = -st.dr;
          if (nc < 0 || nc > 3) st.dc = -st.dc;
          nr = row + st.dr;
          nc = col + st.dc;
        } else {
          // slide along the wall: cancel the offending component
          if (nr < 0 || nr > 3) nr = row;
          if (nc < 0 || nc > 3) nc = col;
        }
        if (!inGrid(nr, nc)) return null;
        row = nr;
        col = nc;
      }
      break;
    }

    case 'perimeter': {
      const steps = stepOverride ?? (movement.step === 'x+1' ? t : movement.step);
      const delta = movement.dir === 'cw' ? steps : -steps;
      st.ringIdx = ((st.ringIdx + delta) % 12 + 12) % 12;
      row = PERIMETER_RING[st.ringIdx].row;
      col = PERIMETER_RING[st.ringIdx].col;
      break;
    }

    case 'direction-cycle': {
      const dir = movement.dirs[(t - 1) % movement.dirs.length];
      const times = stepOverride ?? 1;
      for (let i = 0; i < times; i++) {
        const nr = row + dir.dr;
        const nc = col + dir.dc;
        if (!inGrid(nr, nc)) return null; // generator guarantees legal cycles
        row = nr;
        col = nc;
      }
      break;
    }
  }

  return { pos: { row, col }, state: st };
}

export function rotationAt(program: SymbolProgram, frameIdx: number): 0 | 90 | 180 | 270 {
  if (!program.rotation) return program.initialRotation;
  const sign = program.rotation.dir === 'cw' ? 1 : -1;
  let rot = program.initialRotation as number;
  for (let t = 1; t <= frameIdx; t++) {
    const count = program.rotation.count === 'x+1' ? t : program.rotation.count;
    rot = ((rot + sign * 90 * count) % 360 + 360) % 360;
  }
  return rot as 0 | 90 | 180 | 270;
}

export function colorAt(program: SymbolProgram, frameIdx: number) {
  if (!program.colorRule) return program.color;
  const cycle = program.colorRule.cycle;
  return cycle[frameIdx % cycle.length];
}

export interface SimulationResult {
  frames: Frame[];
  /** states[frameIdx][symbolIdx] — internal movement state at that frame */
  states: SymbolState[][];
}

/**
 * Simulates all symbols over `frameCount` frames. Returns null when the rule
 * program is not legal end-to-end: any collision (two symbols in one cell in
 * the same frame), an off-ring perimeter start, or an illegal cycle move.
 */
export function simulateWithStates(
  programs: SymbolProgram[],
  frameCount = 6,
): SimulationResult | null {
  const positions: Pos[] = [];
  const states: SymbolState[] = [];

  for (const p of programs) {
    positions.push({ row: p.startRow, col: p.startCol });
    if (p.movement.kind === 'perimeter') {
      const idx = ringIndexOf(p.startRow, p.startCol);
      if (idx === -1) return null;
      states.push({ dr: 0, dc: 0, ringIdx: idx });
    } else if (p.movement.kind === 'axis-bounce') {
      states.push({ dr: p.movement.dr, dc: p.movement.dc, ringIdx: 0 });
    } else {
      states.push({ dr: 0, dc: 0, ringIdx: 0 });
    }
  }

  const frames: Frame[] = [];
  const allStates: SymbolState[][] = [];

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    if (frameIdx > 0) {
      for (let i = 0; i < programs.length; i++) {
        const moved = stepSymbol(programs[i].movement, positions[i], states[i], frameIdx);
        if (!moved) return null;
        positions[i] = moved.pos;
        states[i] = moved.state;
      }
    }
    const cells = new Set<string>();
    const frame: PlacedSymbol[] = [];
    for (let i = 0; i < programs.length; i++) {
      const key = `${positions[i].row},${positions[i].col}`;
      if (cells.has(key)) return null; // symbols never overlap
      cells.add(key);
      frame.push({
        symbolId: programs[i].symbolId,
        shape: programs[i].shape,
        color: colorAt(programs[i], frameIdx),
        rotation: rotationAt(programs[i], frameIdx),
        row: positions[i].row as GridIndex,
        col: positions[i].col as GridIndex,
      });
    }
    frames.push(frame);
    allStates.push(states.map((s) => ({ ...s })));
  }

  return { frames, states: allStates };
}

export function simulateFrames(programs: SymbolProgram[], frameCount = 6): Frame[] | null {
  return simulateWithStates(programs, frameCount)?.frames ?? null;
}
