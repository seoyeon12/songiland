/**
 * 시드가 있는 난수 생성기(mulberry32). 상태가 32비트 정수 하나라서 판을 저장했다가
 * 그대로 이어 갈 수 있고, 같은 시드는 언제나 같은 견생을 만든다.
 */
export type Rng = {
  /** [0, 1) */
  next(): number;
  /** [0, maxExclusive) 정수 */
  int(maxExclusive: number): number;
  /** [min, maxInclusive] 정수 */
  intRange(min: number, maxInclusive: number): number;
  /** [min, max) 실수 */
  range(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** 지금 상태. createRng(state)로 같은 흐름을 이어 간다. */
  state(): number;
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new RangeError('maxExclusive must be a positive integer');
    }
    return Math.floor(next() * maxExclusive);
  }

  return {
    next,
    int,
    intRange: (min, maxInclusive) => min + int(maxInclusive - min + 1),
    range: (min, max) => min + next() * (max - min),
    chance: (probability) => next() < probability,
    pick(items) {
      if (items.length === 0) {
        throw new RangeError('cannot pick from an empty list');
      }
      return items[int(items.length)];
    },
    weighted(items, weight) {
      let total = 0;
      for (const item of items) {
        total += Math.max(0, weight(item));
      }
      if (total <= 0) {
        throw new RangeError('weighted pick needs a positive total weight');
      }
      let roll = next() * total;
      for (const item of items) {
        roll -= Math.max(0, weight(item));
        if (roll < 0) {
          return item;
        }
      }
      return items[items.length - 1];
    },
    state: () => a,
  };
}
