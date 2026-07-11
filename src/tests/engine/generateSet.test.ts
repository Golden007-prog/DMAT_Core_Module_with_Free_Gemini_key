import { generateSet, validateQuestion } from '../../engine/generateSet';
import type { EquationQuestion } from '../../engine/types';

describe('generateSet', () => {
  it('produces exactly N validated questions of the requested type', () => {
    const qs = generateSet({ subtest: 'figures', difficulty: 'medium', count: 10, seed: 42 });
    expect(qs).toHaveLength(10);
    for (const q of qs) {
      expect(q.type).toBe('figures');
      expect(validateQuestion(q).ok).toBe(true);
    }
  });

  it('is fully reproducible from the seed (retry-this-exact-set)', () => {
    const a = generateSet({ subtest: 'equations', difficulty: 'hard', count: 5, seed: 7 });
    const b = generateSet({ subtest: 'equations', difficulty: 'hard', count: 5, seed: 7 });
    expect((a[0] as EquationQuestion).equationsDisplay).toEqual(
      (b[0] as EquationQuestion).equationsDisplay,
    );
    expect(a.map((q) => q.seed)).toEqual(b.map((q) => q.seed));
  });

  it('question ids are unique UUIDs even for identical seeds', () => {
    const a = generateSet({ subtest: 'latin', difficulty: 'easy', count: 5, seed: 7 });
    const b = generateSet({ subtest: 'latin', difficulty: 'easy', count: 5, seed: 7 });
    const ids = new Set([...a, ...b].map((q) => q.id));
    expect(ids.size).toBe(10);
  });

  it('mixed difficulty covers all three bands in a 20-set', () => {
    const qs = generateSet({ subtest: 'latin', difficulty: 'mixed', count: 20, seed: 99 });
    const diffs = new Set(qs.map((q) => q.difficulty));
    expect(diffs).toEqual(new Set(['easy', 'medium', 'hard']));
  });

  it('generates a full 20-question set per subtest in under 300 ms', () => {
    for (const subtest of ['figures', 'equations', 'latin'] as const) {
      const start = performance.now();
      const qs = generateSet({ subtest, difficulty: 'hard', count: 20, seed: 1234 });
      const elapsed = performance.now() - start;
      expect(qs).toHaveLength(20);
      expect(elapsed, `${subtest} took ${elapsed.toFixed(0)}ms`).toBeLessThan(300);
    }
  });
});
