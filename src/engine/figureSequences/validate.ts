import type { FigureQuestion, Frame, ValidationResult } from '../types';
import { simulateWithStates } from './simulate';
import { ROTATABLE_SHAPES, isInferable } from './rules';
import { framesVisuallyEqual, frameKey } from './distractors';

export { framesVisuallyEqual };

function framesExactlyEqual(a: Frame, b: Frame): boolean {
  if (a.length !== b.length) return false;
  const key = (f: Frame) =>
    f
      .map((s) => `${s.symbolId}|${s.shape}|${s.color}|${s.rotation}|${s.row}|${s.col}`)
      .sort()
      .join('~');
  return key(a) === key(b);
}

function frameProblems(frame: Frame, label: string): string[] {
  const reasons: string[] = [];
  const cells = new Set<string>();
  for (const s of frame) {
    if (s.row < 0 || s.row > 3 || s.col < 0 || s.col > 3 || !Number.isInteger(s.row) || !Number.isInteger(s.col)) {
      reasons.push(`${label}: symbol outside the 4×4 grid`);
    }
    const key = `${s.row},${s.col}`;
    if (cells.has(key)) reasons.push(`${label}: two symbols share a cell`);
    cells.add(key);
  }
  return reasons;
}

export function validateFigureQuestion(q: FigureQuestion): ValidationResult {
  const reasons: string[] = [];

  if (q.program.length < 1 || q.program.length > 4) {
    reasons.push(`symbol count ${q.program.length} outside 1..4`);
  }
  const shapes = q.program.map((p) => p.shape);
  if (new Set(shapes).size !== shapes.length) reasons.push('duplicate shapes break trackability');
  for (const p of q.program) {
    if (p.rotation && !ROTATABLE_SHAPES.includes(p.shape)) {
      reasons.push(`rotation rule on rotation-invisible shape ${p.shape}`);
    }
    if (p.colorRule) {
      const c = p.colorRule.cycle;
      if (c.length < 2 || c.length > 3) reasons.push('colour cycle length outside 2..3');
      if (new Set(c).size !== c.length) reasons.push('colour cycle repeats a colour');
      if (c[0] !== p.color) reasons.push('colour cycle must start at the base colour');
    }
  }

  const sim = simulateWithStates(q.program, 6);
  if (!sim) {
    reasons.push('program does not simulate legally (collision or off-grid)');
    return { ok: false, reasons };
  }

  // re-simulate and assert the stored frames match
  for (let i = 0; i < 4; i++) {
    if (!framesExactlyEqual(sim.frames[i], q.givenFrames[i])) {
      reasons.push(`given frame ${i + 1} does not match re-simulation`);
    }
  }

  for (const [label, image, frameIdx] of [
    ['image1', q.image1, 4],
    ['image2', q.image2, 5],
  ] as const) {
    const truth = sim.frames[frameIdx];
    if (!framesVisuallyEqual(image.options[image.correct], truth)) {
      reasons.push(`${label}: marked option does not match the simulated frame`);
    }
    image.options.forEach((opt, i) => {
      if (i !== image.correct && framesVisuallyEqual(opt, truth)) {
        reasons.push(`${label}: distractor ${i} equals the correct frame`);
      }
      reasons.push(...frameProblems(opt, `${label} option ${i}`));
    });
    const keys = image.options.map(frameKey);
    if (new Set(keys).size !== keys.length) {
      reasons.push(`${label}: options are not pairwise distinct`);
    }
  }

  for (let i = 0; i < q.givenFrames.length; i++) {
    reasons.push(...frameProblems(q.givenFrames[i], `given frame ${i + 1}`));
  }

  if (!isInferable(q.program, sim.frames)) {
    reasons.push('rule program is not uniquely inferable from frames 1–4');
  }

  if (q.ruleDescriptions.length !== q.program.length) {
    reasons.push('missing per-symbol rule descriptions');
  }

  return { ok: reasons.length === 0, reasons };
}
