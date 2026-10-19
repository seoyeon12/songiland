import type { DrawPlan, RandomInt } from './types';

const POOL_MIN = 1;
const POOL_MAX = 45;
const MAIN_COUNT = 6;
const DRAW_COUNT = 7;

/**
 * Uniform integer in [0, upperExclusive) sampled from Web Crypto with rejection
 * sampling to avoid modulo bias. Never reads the clock or Three.js state.
 */
export function cryptoRandomInt(upperExclusive: number): number {
  if (upperExclusive <= 0) {
    throw new RangeError('upperExclusive must be a positive integer');
  }
  const range = 0x100000000; // 2^32, the size of a Uint32 sample space
  const limit = range - (range % upperExclusive); // largest unbiased multiple
  const sample = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(sample);
    value = sample[0];
  } while (value >= limit);
  return value % upperExclusive;
}

/**
 * Confirms the entire draw before any animation. Shuffles 1..45 with
 * Fisher–Yates, then takes seven distinct values: six main numbers and a bonus.
 */
export function createDrawPlan(random: RandomInt = cryptoRandomInt): DrawPlan {
  const pool: number[] = [];
  for (let value = POOL_MIN; value <= POOL_MAX; value += 1) {
    pool.push(value);
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const drawn = pool.slice(0, DRAW_COUNT);
  const main = drawn.slice(0, MAIN_COUNT) as DrawPlan['main'];
  const bonus = drawn[MAIN_COUNT];
  const revealOrder = drawn as DrawPlan['revealOrder'];
  const sortedMain = [...main].sort((a, b) => a - b) as DrawPlan['sortedMain'];

  return { main, bonus, revealOrder, sortedMain };
}
