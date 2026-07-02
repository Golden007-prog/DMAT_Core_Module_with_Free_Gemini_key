import { createPrng } from '../../engine/prng';
import { generateEquationQuestion } from '../../engine/equations/generator';
import { validateEquationQuestion, parseEquation } from '../../engine/equations/validate';
import { countSolutions } from '../../engine/equations/solver';
import type { Difficulty } from '../../engine/types';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
const VAR_COUNT: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 };

describe('equations solver (pruned brute force over [1..20]^n)', () => {
  it('finds the unique solution of a determinate system', () => {
    // 7 + A = 14 ; B − 3 = A  →  A=7, B=10
    const eqs: import('../../engine/equations/solver').LinearEq[] = [
      { coeffs: { A: 1 }, constant: 7 },
      { coeffs: { B: 1, A: -1 }, constant: 3 },
    ];
    const res = countSolutions(eqs, ['A', 'B'], 20, 2);
    expect(res.count).toBe(1);
    expect(res.solutions[0]).toEqual({ A: 7, B: 10 });
  });

  it('reports multiple solutions for an ambiguous system', () => {
    // A + B = 10 → nine solutions in [1..20]^2
    const res = countSolutions([{ coeffs: { A: 1, B: 1 }, constant: 10 }], ['A', 'B'], 20, 5);
    expect(res.count).toBeGreaterThan(1);
  });

  it('reports zero solutions for an insoluble system', () => {
    const res = countSolutions([{ coeffs: { A: 1, B: 1 }, constant: 100 }], ['A', 'B'], 20, 2);
    expect(res.count).toBe(0);
  });
});

describe('equation display parser', () => {
  it('parses official-style forms into linear equations', () => {
    expect(parseEquation('7 + A = 14')).toEqual({ coeffs: { A: 1 }, constant: 7 });
    expect(parseEquation('B − 3 = A')).toEqual({ coeffs: { B: 1, A: -1 }, constant: 3 });
    expect(parseEquation('B ÷ 2 = A')).toEqual({ coeffs: { B: 0.5, A: -1 }, constant: 0 });
    expect(parseEquation('3 × C = A')).toEqual({ coeffs: { C: 3, A: -1 }, constant: 0 });
    expect(parseEquation('A − B + C − D = 2')).toEqual({
      coeffs: { A: 1, B: -1, C: 1, D: -1 },
      constant: 2,
    });
    expect(parseEquation('3 × C − 1 = B')).toEqual({ coeffs: { C: 3, B: -1 }, constant: 1 });
  });

  it('rejects strings outside the official grammar', () => {
    expect(() => parseEquation('A * B = 4')).toThrow();
    expect(() => parseEquation('A^2 = 4')).toThrow();
    expect(() => parseEquation('= 4')).toThrow();
  });
});

describe('generateEquationQuestion', () => {
  it('is deterministic for a given seed', () => {
    const q1 = generateEquationQuestion('medium', createPrng(555), 'choice');
    const q2 = generateEquationQuestion('medium', createPrng(555), 'choice');
    expect(q1.equationsDisplay).toEqual(q2.equationsDisplay);
    expect(q1.solution).toEqual(q2.solution);
    expect(q1.target?.options).toEqual(q2.target?.options);
  });

  it.each(DIFFS)('%s: 1000 seeds → all pass the validator', (diff) => {
    for (let seed = 1; seed <= 1000; seed++) {
      const q = generateEquationQuestion(diff, createPrng(seed), 'choice');
      const res = validateEquationQuestion(q);
      if (!res.ok) {
        throw new Error(`seed ${seed} (${diff}) failed: ${res.reasons.join('; ')}\n${q.equationsDisplay.join('\n')}`);
      }
    }
  });

  it.each(DIFFS)('%s: structure matches the difficulty table', (diff) => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateEquationQuestion(diff, createPrng(seed), 'choice');
      expect(q.variables).toHaveLength(VAR_COUNT[diff]);
      expect(q.equationsDisplay).toHaveLength(VAR_COUNT[diff]);
      for (const v of q.variables) {
        expect(q.solution[v]).toBeGreaterThanOrEqual(1);
        expect(q.solution[v]).toBeLessThanOrEqual(20);
      }
      expect(q.explanationSteps.length).toBeGreaterThan(0);
      expect(q.ruleTags.length).toBeGreaterThan(0);
    }
  });

  it('hard questions contain a hub equation over 3–4 variables', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const q = generateEquationQuestion('hard', createPrng(seed), 'choice');
      const hasHub = q.equationsDisplay.some(
        (e) => (e.match(/[A-D]/g) ?? []).length >= 3,
      );
      expect(hasHub, `seed ${seed}: ${q.equationsDisplay.join(' | ')}`).toBe(true);
      expect(q.ruleTags).toContain('eq.hub');
    }
  });

  it('choice mode: 5 distinct options within 1..20 containing the correct value once', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateEquationQuestion('medium', createPrng(seed), 'choice');
      expect(q.target).toBeDefined();
      const t = q.target!;
      expect(t.options).toHaveLength(5);
      expect(new Set(t.options).size).toBe(5);
      for (const o of t.options) {
        expect(o).toBeGreaterThanOrEqual(1);
        expect(o).toBeLessThanOrEqual(20);
      }
      expect(t.options[t.correct]).toBe(q.solution[t.variable]);
    }
  });

  it('entry mode: no target, all variables answerable', () => {
    const q = generateEquationQuestion('easy', createPrng(9), 'entry');
    expect(q.askMode).toBe('entry');
    expect(q.target).toBeUndefined();
  });

  it('uses real × and ÷ glyphs, never * or /', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateEquationQuestion('hard', createPrng(seed), 'choice');
      for (const e of q.equationsDisplay) {
        expect(e).not.toMatch(/[*/]/);
        expect(e).toMatch(/^[A-D0-9 +−×÷=]+$/);
      }
    }
  });

  it('distribution sanity: multiplication and division forms both appear across seeds', () => {
    let mul = 0;
    let div = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateEquationQuestion('medium', createPrng(seed), 'choice');
      if (q.equationsDisplay.some((e) => e.includes('×'))) mul++;
      if (q.equationsDisplay.some((e) => e.includes('÷'))) div++;
    }
    expect(mul).toBeGreaterThan(10);
    expect(div).toBeGreaterThan(10);
  });
});

describe('validateEquationQuestion (firewall for AI output too)', () => {
  it('rejects a question whose system is ambiguous', () => {
    const q = generateEquationQuestion('easy', createPrng(1), 'choice');
    const bad = { ...q, equationsDisplay: ['A + B = 10', 'B + A = 10'] };
    expect(validateEquationQuestion(bad).ok).toBe(false);
  });

  it('rejects a question whose stated solution does not satisfy the system', () => {
    const q = generateEquationQuestion('easy', createPrng(2), 'choice');
    const wrongSolution = Object.fromEntries(
      Object.entries(q.solution).map(([k, v]) => [k, v === 20 ? 1 : v + 1]),
    );
    const bad = { ...q, solution: wrongSolution };
    expect(validateEquationQuestion(bad).ok).toBe(false);
  });

  it('rejects malformed display grammar', () => {
    const q = generateEquationQuestion('easy', createPrng(3), 'choice');
    const bad = { ...q, equationsDisplay: ['A ** 2 = 4', ...q.equationsDisplay.slice(1)] };
    expect(validateEquationQuestion(bad).ok).toBe(false);
  });
});
