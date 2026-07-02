import type { Frame, GridIndex, PlacedSymbol, SymbolProgram } from '../types';
import type { Prng } from '../prng';
import { colorAt, stepSymbol, type SimulationResult } from './simulate';
import { visualRotation } from './rules';

export function frameKey(frame: Frame): string {
  return frame
    .map((s) => `${s.shape}|${s.color}|${visualRotation(s.shape, s.rotation)}|${s.row}|${s.col}`)
    .sort()
    .join('~');
}

export function framesVisuallyEqual(a: Frame, b: Frame): boolean {
  return frameKey(a) === frameKey(b);
}

function frameIsLegal(frame: Frame): boolean {
  const cells = new Set<string>();
  for (const s of frame) {
    if (s.row < 0 || s.row > 3 || s.col < 0 || s.col > 3) return false;
    const key = `${s.row},${s.col}`;
    if (cells.has(key)) return false;
    cells.add(key);
  }
  return true;
}

function replaceSymbol(frame: Frame, idx: number, patch: Partial<PlacedSymbol>): Frame {
  return frame.map((s, i) => (i === idx ? { ...s, ...patch } : { ...s }));
}

/**
 * Near-miss perturbations of the true frame (§5.1): one step short/extra,
 * wrong rotation direction, colour phase off by one, bounce-vs-slide
 * confusion, reflected diagonal. All candidates are legal-looking (in-grid,
 * no overlaps) and visually distinct from the correct frame.
 */
function perturbationCandidates(
  programs: SymbolProgram[],
  sim: SimulationResult,
  frameIdx: number,
  prng: Prng,
): Frame[] {
  const correct = sim.frames[frameIdx];
  const prev = sim.frames[frameIdx - 1];
  const prevStates = sim.states[frameIdx - 1];
  const t = frameIdx; // 1-based transition number
  const out: Frame[] = [];

  const consider = (frame: Frame) => {
    if (frameIsLegal(frame) && !framesVisuallyEqual(frame, correct)) out.push(frame);
  };

  programs.forEach((p, i) => {
    const prevPos = { row: prev[i].row, col: prev[i].col };
    const truePos = { row: correct[i].row, col: correct[i].col };

    // one step short / one step extra (also 0/2 applications of a cycle step)
    if (p.movement.kind !== 'static') {
      const base =
        p.movement.kind === 'direction-cycle'
          ? 1
          : p.movement.step === 'x+1'
            ? t
            : p.movement.step;
      for (const delta of [-1, 1]) {
        const steps = base + delta;
        if (steps < 0) continue;
        const moved = stepSymbol(p.movement, prevPos, prevStates[i], t, steps);
        if (moved && (moved.pos.row !== truePos.row || moved.pos.col !== truePos.col)) {
          consider(
            replaceSymbol(correct, i, {
              row: moved.pos.row as GridIndex,
              col: moved.pos.col as GridIndex,
            }),
          );
        }
      }
    }

    // wrong rotation direction
    if (p.rotation) {
      const count = p.rotation.count === 'x+1' ? t : p.rotation.count;
      const sign = p.rotation.dir === 'cw' ? 1 : -1;
      const wrong = ((prev[i].rotation - sign * 90 * count) % 360 + 360) % 360;
      if (visualRotation(p.shape, wrong) !== visualRotation(p.shape, correct[i].rotation)) {
        consider(replaceSymbol(correct, i, { rotation: wrong as PlacedSymbol['rotation'] }));
      }
    }

    // colour phase off by one (stale or skipped)
    if (p.colorRule) {
      for (const offset of [-1, 1]) {
        const len = p.colorRule.cycle.length;
        const wrong = p.colorRule.cycle[(((frameIdx + offset) % len) + len) % len];
        if (wrong !== colorAt(p, frameIdx)) {
          consider(replaceSymbol(correct, i, { color: wrong }));
        }
      }
    }

    // bounce-vs-wall-slide confusion / reflected diagonal
    if (p.movement.kind === 'axis-bounce' && p.movement.dr !== 0 && p.movement.dc !== 0) {
      const flipped = {
        ...p.movement,
        boundary: p.movement.boundary === 'bounce' ? ('slide' as const) : ('bounce' as const),
      };
      const movedFlip = stepSymbol(flipped, prevPos, prevStates[i], t);
      if (movedFlip && (movedFlip.pos.row !== truePos.row || movedFlip.pos.col !== truePos.col)) {
        consider(
          replaceSymbol(correct, i, {
            row: movedFlip.pos.row as GridIndex,
            col: movedFlip.pos.col as GridIndex,
          }),
        );
      }
      const mirrored = stepSymbol(
        p.movement,
        prevPos,
        { ...prevStates[i], dc: -prevStates[i].dc },
        t,
      );
      if (mirrored && (mirrored.pos.row !== truePos.row || mirrored.pos.col !== truePos.col)) {
        consider(
          replaceSymbol(correct, i, {
            row: mirrored.pos.row as GridIndex,
            col: mirrored.pos.col as GridIndex,
          }),
        );
      }
    }
  });

  // fallback: nudge one symbol to a free neighbouring cell
  for (let tries = 0; tries < 12; tries++) {
    const i = prng.int(0, programs.length - 1);
    const dr = prng.int(-1, 1);
    const dc = prng.int(-1, 1);
    if (dr === 0 && dc === 0) continue;
    consider(
      replaceSymbol(correct, i, {
        row: (correct[i].row + dr) as GridIndex,
        col: (correct[i].col + dc) as GridIndex,
      }),
    );
  }

  return out;
}

/** Two legal, plausible, pairwise-distinct distractor frames for one image. */
export function buildDistractorFrames(
  programs: SymbolProgram[],
  sim: SimulationResult,
  frameIdx: number,
  prng: Prng,
): [Frame, Frame] | null {
  const candidates = prng.shuffle(perturbationCandidates(programs, sim, frameIdx, prng));
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (!framesVisuallyEqual(candidates[i], candidates[j])) {
        return [candidates[i], candidates[j]];
      }
    }
  }
  return null;
}
