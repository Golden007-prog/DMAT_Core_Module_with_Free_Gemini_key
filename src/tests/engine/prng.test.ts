import { createPrng } from '../../engine/prng';

describe('createPrng (mulberry32)', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createPrng(12345);
    const b = createPrng(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createPrng(1);
    const b = createPrng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays within [0, 1)', () => {
    const p = createPrng(99);
    for (let i = 0; i < 1000; i++) {
      const v = p.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(min, max) is inclusive on both ends and covers the range', () => {
    const p = createPrng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = p.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it('pick returns an element of the array', () => {
    const p = createPrng(3);
    const arr = ['x', 'y', 'z'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(p.pick(arr));
    }
  });

  it('shuffle returns a permutation without mutating the input', () => {
    const p = createPrng(42);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const out = p.shuffle(input);
    expect(input).toEqual(copy);
    expect([...out].sort((a, b) => a - b)).toEqual(copy);
  });

  it('shuffle is deterministic per seed', () => {
    const out1 = createPrng(42).shuffle([1, 2, 3, 4, 5]);
    const out2 = createPrng(42).shuffle([1, 2, 3, 4, 5]);
    expect(out1).toEqual(out2);
  });

  it('chance(p) respects probability roughly', () => {
    const p = createPrng(11);
    let hits = 0;
    for (let i = 0; i < 5000; i++) if (p.chance(0.3)) hits++;
    expect(hits / 5000).toBeGreaterThan(0.25);
    expect(hits / 5000).toBeLessThan(0.35);
  });
});
