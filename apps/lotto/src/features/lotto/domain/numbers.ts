import type { LottoNumbers, MainNumbers, RandomInt } from './types';

const POOL_MIN = 1;
const POOL_MAX = 45;
const MAIN_COUNT = 6;

/**
 * Uniform integer in [0, upperExclusive) sampled from Web Crypto with rejection
 * sampling to avoid modulo bias.
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
 * Shuffles 1..45 with Fisher–Yates and takes seven distinct values: six main
 * numbers (returned in ascending order) and one bonus number.
 */
export function drawNumbers(random: RandomInt = cryptoRandomInt): LottoNumbers {
  const pool: number[] = [];
  for (let value = POOL_MIN; value <= POOL_MAX; value += 1) {
    pool.push(value);
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const main = pool.slice(0, MAIN_COUNT).sort((a, b) => a - b) as MainNumbers;
  return { main, bonus: pool[MAIN_COUNT] };
}
