import { createPrng } from '../../engine/prng';
import { simulateFrames } from '../../engine/figureSequences/simulate';
import { generateFigureQuestion } from '../../engine/figureSequences/generator';
import {
  validateFigureQuestion,
  framesVisuallyEqual,
} from '../../engine/figureSequences/validate';
import type { Difficulty, SymbolProgram } from '../../engine/types';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];

function baseSymbol(over: Partial<SymbolProgram>): SymbolProgram {
  return {
    symbolId: 's1',
    shape: 'triangle',
    color: 'pink',
    initialRotation: 0,
    startRow: 0,
    startCol: 0,
    movement: { kind: 'static' },
    ...over,
  };
}

describe('simulateFrames', () => {
  it('moves along an axis and bounces off the wall', () => {
    const prog = baseSymbol({
      movement: { kind: 'axis-bounce', dr: 0, dc: 1, step: 1, boundary: 'bounce' },
    });
    const frames = simulateFrames([prog], 6)!;
    expect(frames.map((f) => f[0].col)).toEqual([0, 1, 2, 3, 2, 1]);
    expect(frames.map((f) => f[0].row)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('walks the perimeter clockwise', () => {
    const prog = baseSymbol({
      movement: { kind: 'perimeter', dir: 'cw', step: 1 },
    });
    const frames = simulateFrames([prog], 6)!;
    expect(frames.map((f) => [f[0].row, f[0].col])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
      [2, 3],
    ]);
  });

  it('accelerates with x+1 (1, 2, 3, … cells per transition)', () => {
    const prog = baseSymbol({
      startRow: 3,
      movement: { kind: 'axis-bounce', dr: 0, dc: 1, step: 'x+1', boundary: 'bounce' },
    });
    const frames = simulateFrames([prog], 3)!;
    // t1: +1 → col 1 ; t2: +2 → col 3
    expect(frames.map((f) => f[0].col)).toEqual([0, 1, 3]);
  });

  it('applies rotation rules in 90° steps', () => {
    const prog = baseSymbol({
      rotation: { dir: 'cw', count: 1 },
    });
    const frames = simulateFrames([prog], 6)!;
    expect(frames.map((f) => f[0].rotation)).toEqual([0, 90, 180, 270, 0, 90]);
  });

  it('cycles colours', () => {
    const prog = baseSymbol({
      color: 'black',
      colorRule: { cycle: ['black', 'pink'] },
    });
    const frames = simulateFrames([prog], 4)!;
    expect(frames.map((f) => f[0].color)).toEqual(['black', 'pink', 'black', 'pink']);
  });

  it('returns null when two symbols collide', () => {
    const a = baseSymbol({ symbolId: 'a', startRow: 0, startCol: 0 });
    const b = baseSymbol({
      symbolId: 'b',
      shape: 'square',
      startRow: 0,
      startCol: 2,
      movement: { kind: 'axis-bounce', dr: 0, dc: -1, step: 1, boundary: 'bounce' },
    });
    // b walks left into a's static cell on transition 2
    expect(simulateFrames([a, b], 6)).toBeNull();
  });

  it('never lets a symbol leave the 4×4 grid', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateFigureQuestion('hard', createPrng(seed));
      const all = [
        ...q.givenFrames,
        ...q.image1.options,
        ...q.image2.options,
      ];
      for (const frame of all) {
        for (const s of frame) {
          expect(s.row).toBeGreaterThanOrEqual(0);
          expect(s.row).toBeLessThanOrEqual(3);
          expect(s.col).toBeGreaterThanOrEqual(0);
          expect(s.col).toBeLessThanOrEqual(3);
        }
      }
    }
  });
});

describe('generateFigureQuestion', () => {
  it('is deterministic for a given seed', () => {
    const q1 = generateFigureQuestion('medium', createPrng(321));
    const q2 = generateFigureQuestion('medium', createPrng(321));
    expect(q1.givenFrames).toEqual(q2.givenFrames);
    expect(q1.image1).toEqual(q2.image1);
    expect(q1.image2).toEqual(q2.image2);
  });

  it.each(DIFFS)('%s: 1000 seeds → all pass the validator', (diff) => {
    for (let seed = 1; seed <= 1000; seed++) {
      const q = generateFigureQuestion(diff, createPrng(seed));
      const res = validateFigureQuestion(q);
      if (!res.ok) {
        throw new Error(`seed ${seed} (${diff}) failed: ${res.reasons.join('; ')}`);
      }
    }
  });

  it.each(DIFFS)('%s: symbol count matches the difficulty table', (diff) => {
    const expected: Record<Difficulty, [number, number]> = {
      easy: [1, 1],
      medium: [2, 3],
      hard: [3, 4],
    };
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateFigureQuestion(diff, createPrng(seed));
      const n = q.program.length;
      expect(n).toBeGreaterThanOrEqual(expected[diff][0]);
      expect(n).toBeLessThanOrEqual(expected[diff][1]);
    }
  });

  it('easy: single symbol with one simple movement rule, constant step', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateFigureQuestion('easy', createPrng(seed));
      const p = q.program[0];
      expect(p.rotation).toBeUndefined();
      expect(p.colorRule).toBeUndefined();
      expect(['axis-bounce', 'perimeter']).toContain(p.movement.kind);
      if (p.movement.kind === 'axis-bounce' || p.movement.kind === 'perimeter') {
        expect(p.movement.step).not.toBe('x+1');
      }
    }
  });

  it('hard: contains an x+1 rule, a move+rotate+colour symbol, and a diagonal path', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const q = generateFigureQuestion('hard', createPrng(seed));
      expect(q.ruleTags).toContain('fig.accel.x+1');
      const combined = q.program.some(
        (p) => p.movement.kind !== 'static' && p.rotation && p.colorRule,
      );
      expect(combined, `seed ${seed} lacks move+rotate+colour symbol`).toBe(true);
      const diagonal = q.program.some(
        (p) => p.movement.kind === 'axis-bounce' && p.movement.dr !== 0 && p.movement.dc !== 0,
      );
      expect(diagonal, `seed ${seed} lacks diagonal path`).toBe(true);
    }
  });

  it('shapes are unique within a question so symbols stay trackable', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateFigureQuestion('hard', createPrng(seed));
      const shapes = q.program.map((p) => p.shape);
      expect(new Set(shapes).size).toBe(shapes.length);
    }
  });

  it('answer options: exactly one correct, distractors visually distinct and legal', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateFigureQuestion('medium', createPrng(seed));
      for (const image of [q.image1, q.image2]) {
        const [a, b, c] = image.options;
        expect(framesVisuallyEqual(a, b)).toBe(false);
        expect(framesVisuallyEqual(a, c)).toBe(false);
        expect(framesVisuallyEqual(b, c)).toBe(false);
        for (const frame of image.options) {
          const cells = frame.map((s) => `${s.row},${s.col}`);
          expect(new Set(cells).size).toBe(cells.length); // no overlaps
        }
      }
    }
  });

  it('every symbol changes something in at least 4 of 5 transitions', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateFigureQuestion('medium', createPrng(seed));
      const frames = [...q.givenFrames, q.image1.options[q.image1.correct], q.image2.options[q.image2.correct]];
      for (const p of q.program) {
        let changes = 0;
        for (let t = 0; t < 5; t++) {
          const before = frames[t].find((s) => s.symbolId === p.symbolId)!;
          const after = frames[t + 1].find((s) => s.symbolId === p.symbolId)!;
          if (
            before.row !== after.row ||
            before.col !== after.col ||
            before.rotation !== after.rotation ||
            before.color !== after.color
          ) {
            changes++;
          }
        }
        expect(changes, `seed ${seed} symbol ${p.symbolId}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('has rule descriptions and rule tags', () => {
    const q = generateFigureQuestion('medium', createPrng(1));
    expect(q.ruleDescriptions.length).toBe(q.program.length);
    expect(q.ruleTags.length).toBeGreaterThan(0);
  });
});

describe('validateFigureQuestion', () => {
  it('rejects a tampered correct index', () => {
    const q = generateFigureQuestion('easy', createPrng(10));
    const bad = {
      ...q,
      image1: { ...q.image1, correct: ((q.image1.correct + 1) % 3) as 0 | 1 | 2 },
    };
    expect(validateFigureQuestion(bad).ok).toBe(false);
  });

  it('rejects a tampered given frame (re-simulation mismatch)', () => {
    const q = generateFigureQuestion('easy', createPrng(11));
    const frames = q.givenFrames.map((f) => f.map((s) => ({ ...s }))) as typeof q.givenFrames;
    frames[2][0].row = ((frames[2][0].row + 1) % 4) as 0 | 1 | 2 | 3;
    expect(validateFigureQuestion({ ...q, givenFrames: frames }).ok).toBe(false);
  });

  it('rejects duplicate distractors', () => {
    const q = generateFigureQuestion('easy', createPrng(12));
    const correctIdx = q.image1.correct;
    const otherIdx = ((correctIdx + 1) % 3) as 0 | 1 | 2;
    const options = [...q.image1.options] as typeof q.image1.options;
    // clone one distractor over the other
    const remaining = [0, 1, 2].filter((i) => i !== correctIdx) as [number, number];
    options[remaining[0]] = options[remaining[1]].map((s) => ({ ...s }));
    void otherIdx;
    expect(
      validateFigureQuestion({ ...q, image1: { ...q.image1, options } }).ok,
    ).toBe(false);
  });
});
