import { describe, expect, it } from 'vitest';
import {
  BURNT_SERVE_PENALTY,
  comboMultiplier,
  emptyTally,
  GRADE_POINTS,
  MISMATCH_PENALTY,
  scoreServes,
  serveOutcome,
  type Serve,
} from './scoring';

const perfect: Serve = { grade: 'perfect', matched: true };
const good: Serve = { grade: 'good', matched: true };
const cold: Serve = { grade: 'cold', matched: true };

describe('comboMultiplier', () => {
  it('rises every 3 perfects and caps at 3x', () => {
    expect(comboMultiplier(1)).toBe(1);
    expect(comboMultiplier(2)).toBe(1);
    expect(comboMultiplier(3)).toBe(2);
    expect(comboMultiplier(6)).toBe(3);
    expect(comboMultiplier(99)).toBe(3);
  });
});

describe('serveOutcome', () => {
  it('refuses burnt first, then a wrong filling', () => {
    expect(serveOutcome(perfect)).toBe('accepted');
    expect(serveOutcome({ grade: 'good', matched: false })).toBe('mismatch');
    expect(serveOutcome({ grade: 'burnt', matched: true })).toBe('burnt');
    expect(serveOutcome({ grade: 'burnt', matched: false })).toBe('burnt');
  });
});

describe('scoreServes', () => {
  it('adds base points for non-perfect serves', () => {
    const result = scoreServes([good, cold]);
    expect(result.score).toBe(GRADE_POINTS.good + GRADE_POINTS.cold);
    expect(result.bestStreak).toBe(0);
    expect(result.served).toBe(2);
  });

  it('applies the combo multiplier to a perfect streak', () => {
    // 3연속 Perfect: 100*1 + 100*1 + 100*2 = 400, 최고 콤보 3.
    const result = scoreServes([perfect, perfect, perfect]);
    expect(result.score).toBe(100 + 100 + 200);
    expect(result.bestStreak).toBe(3);
    expect(result.counts.perfect).toBe(3);
  });

  it('breaks the streak on a non-perfect serve', () => {
    const result = scoreServes([perfect, perfect, good, perfect]);
    expect(result.score).toBe(100 + 100 + 70 + 100);
    expect(result.bestStreak).toBe(2);
  });

  it('penalises a refused serve, breaks the streak and does not count it as served', () => {
    const result = scoreServes([perfect, perfect, { grade: 'perfect', matched: false }, perfect]);
    expect(result.score).toBe(100 + 100 + MISMATCH_PENALTY + 100);
    expect(result.mismatches).toBe(1);
    expect(result.served).toBe(3);
    expect(result.bestStreak).toBe(2);
  });

  it('penalises serving a burnt one harder', () => {
    const result = scoreServes([perfect, good, { grade: 'burnt', matched: true }]);
    expect(result.score).toBe(100 + 70 + BURNT_SERVE_PENALTY);
    expect(result.burntServes).toBe(1);
    expect(result.served).toBe(2);
  });

  it('never drops below zero', () => {
    const burnt: Serve = { grade: 'burnt', matched: true };
    expect(scoreServes([burnt, burnt, burnt]).score).toBe(0);
  });

  it('counts an empty shift as zero', () => {
    expect(scoreServes([])).toEqual(emptyTally());
  });
});
