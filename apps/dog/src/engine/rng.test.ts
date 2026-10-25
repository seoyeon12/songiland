import { createRng } from './rng';

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(new Set(seqA).size).toBe(20);
  });

  it('continues exactly from a saved state', () => {
    const rng = createRng(7);
    rng.next();
    rng.next();
    const resumed = createRng(rng.state());
    expect(Array.from({ length: 5 }, () => resumed.next())).toEqual(
      Array.from({ length: 5 }, () => rng.next()),
    );
  });

  it('keeps integers inside their bounds', () => {
    const rng = createRng(1);
    for (let i = 0; i < 2000; i += 1) {
      const n = rng.intRange(2, 4);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
      expect(Number.isInteger(n)).toBe(true);
    }
    expect(() => rng.int(0)).toThrow(RangeError);
  });

  it('picks weighted items in proportion to their weights', () => {
    const rng = createRng(123);
    const counts = { a: 0, b: 0, c: 0 };
    const items = [
      { id: 'a' as const, w: 1 },
      { id: 'b' as const, w: 3 },
      { id: 'c' as const, w: 0 },
    ];
    for (let i = 0; i < 20000; i += 1) {
      counts[rng.weighted(items, (item) => item.w).id] += 1;
    }
    expect(counts.c).toBe(0);
    expect(counts.b / (counts.a + counts.b)).toBeCloseTo(0.75, 1);
  });
});
