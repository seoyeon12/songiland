import { describe, expect, it } from 'vitest';
import { FILLING_IDS } from './data/fillings';
import { createShift, dailyKey, dailySeed, difficultyAt, SHIFT_MS } from './shift';

describe('createShift', () => {
  it('is deterministic for the same seed', () => {
    expect(createShift(1234)).toEqual(createShift(1234));
  });

  it('differs for different seeds', () => {
    expect(createShift(1).orders).not.toEqual(createShift(2).orders);
  });

  it('fills a 90s shift with ordered, in-range orders', () => {
    const shift = createShift(42);
    expect(shift.durationMs).toBe(SHIFT_MS);
    expect(shift.orders.length).toBeGreaterThan(5);
    let last = -1;
    for (const order of shift.orders) {
      expect(order.atMs).toBeGreaterThanOrEqual(0);
      expect(order.atMs).toBeLessThan(SHIFT_MS);
      expect(order.atMs).toBeGreaterThan(last); // 시간순
      expect(order.count).toBeGreaterThanOrEqual(1);
      expect(FILLING_IDS).toContain(order.filling);
      last = order.atMs;
    }
  });

  it('only serves 팥·슈크림 in the first half, across many seeds', () => {
    const lateFilling = FILLING_IDS[2]; // 고구마
    for (let seed = 1; seed <= 50; seed += 1) {
      for (const order of createShift(seed).orders) {
        if (order.atMs < SHIFT_MS / 2) {
          expect(order.filling).not.toBe(lateFilling);
        }
      }
    }
  });
});

describe('difficultyAt', () => {
  it('runs 0 at the start to 1 at the end', () => {
    expect(difficultyAt(0)).toBe(0);
    expect(difficultyAt(SHIFT_MS / 2)).toBeCloseTo(0.5);
    expect(difficultyAt(SHIFT_MS)).toBe(1);
    expect(difficultyAt(SHIFT_MS * 2)).toBe(1); // 넘어가도 1로 고정
  });
});

describe('dailyKey / dailySeed (UTC 기준)', () => {
  it('derives from the UTC calendar day, independent of the time of day', () => {
    const morning = new Date(Date.UTC(2026, 10, 8, 0, 0, 0));
    const night = new Date(Date.UTC(2026, 10, 8, 23, 59, 59));
    expect(dailyKey(morning)).toBe('2026-11-08');
    expect(dailyKey(night)).toBe('2026-11-08');
    expect(dailySeed(morning)).toBe(dailySeed(night));
  });

  it('gives a different seed on a different day', () => {
    const a = new Date(Date.UTC(2026, 10, 8));
    const b = new Date(Date.UTC(2026, 10, 9));
    expect(dailyKey(a)).not.toBe(dailyKey(b));
    expect(dailySeed(a)).not.toBe(dailySeed(b));
  });

  it('feeds a reproducible daily shift', () => {
    const date = new Date(Date.UTC(2026, 10, 8));
    expect(createShift(dailySeed(date))).toEqual(createShift(dailySeed(date)));
  });
});
