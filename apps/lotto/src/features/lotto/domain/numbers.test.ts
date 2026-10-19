import { createDrawPlan } from './numbers';

it('creates six main numbers and a different bonus number in the 1..45 range', () => {
  const draw = createDrawPlan(() => 0);
  expect(draw.main).toHaveLength(6);
  expect(draw.revealOrder).toHaveLength(7);
  expect(new Set(draw.revealOrder).size).toBe(7);
  expect(draw.revealOrder.every((number) => number >= 1 && number <= 45)).toBe(true);
  expect(draw.main).not.toContain(draw.bonus);
});

it('returns sorted main numbers without changing their reveal order', () => {
  const draw = createDrawPlan((limit) => limit - 1);
  expect(draw.sortedMain).toEqual([...draw.main].sort((a, b) => a - b));
  expect(draw.revealOrder.slice(0, 6)).toEqual(draw.main);
});
