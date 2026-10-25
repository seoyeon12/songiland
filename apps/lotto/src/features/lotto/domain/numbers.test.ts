import { drawNumbers } from './numbers';

it('draws six main numbers and a different bonus number in the 1..45 range', () => {
  for (const random of [() => 0, (limit: number) => limit - 1, undefined]) {
    const { main, bonus } = drawNumbers(random);
    const all = [...main, bonus];
    expect(main).toHaveLength(6);
    expect(new Set(all).size).toBe(7);
    expect(all.every((number) => number >= 1 && number <= 45)).toBe(true);
  }
});

it('returns the main numbers in ascending order', () => {
  const { main } = drawNumbers((limit) => Math.floor(limit / 2));
  expect(main).toEqual([...main].sort((a, b) => a - b));
});
