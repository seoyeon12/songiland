import { describe, expect, it } from 'vitest';
import { COOL_STEP_MS, cookWindow, cooledGrade, judge } from './baking';

describe('cookWindow', () => {
  it('narrows the green window and cooks faster as difficulty rises', () => {
    const easy = cookWindow(0);
    const hard = cookWindow(1);
    const easyWidth = easy.greenEndMs - easy.greenStartMs;
    const hardWidth = hard.greenEndMs - hard.greenStartMs;
    expect(hardWidth).toBeLessThan(easyWidth);
    expect(hard.greenStartMs).toBeLessThan(easy.greenStartMs);
  });

  it('keeps the perfect window inside the green window', () => {
    for (const d of [0, 0.5, 1]) {
      const w = cookWindow(d);
      expect(w.greenStartMs).toBeLessThan(w.perfectStartMs);
      expect(w.perfectStartMs).toBeLessThan(w.perfectEndMs);
      expect(w.perfectEndMs).toBeLessThan(w.greenEndMs);
    }
  });

  it('clamps difficulty outside 0..1', () => {
    expect(cookWindow(-1)).toEqual(cookWindow(0));
    expect(cookWindow(2)).toEqual(cookWindow(1));
  });
});

describe('judge', () => {
  const w = cookWindow(0.5);

  it('grades by where the flip lands relative to the green window', () => {
    expect(judge(w, w.greenStartMs - 1)).toBe('raw');
    expect(judge(w, w.greenStartMs)).toBe('good'); // 초록 시작은 가장자리
    expect(judge(w, (w.perfectStartMs + w.perfectEndMs) / 2)).toBe('perfect');
    expect(judge(w, w.greenEndMs)).toBe('good'); // 초록 끝도 가장자리
    expect(judge(w, w.greenEndMs + 1)).toBe('burnt');
  });

  it('treats the perfect boundaries as perfect (inclusive)', () => {
    expect(judge(w, w.perfectStartMs)).toBe('perfect');
    expect(judge(w, w.perfectEndMs)).toBe('perfect');
  });
});

describe('cooledGrade', () => {
  it('cools one step per COOL_STEP_MS: perfect → good → cold', () => {
    expect(cooledGrade('perfect', 0)).toBe('perfect');
    expect(cooledGrade('perfect', COOL_STEP_MS - 1)).toBe('perfect');
    expect(cooledGrade('perfect', COOL_STEP_MS)).toBe('good');
    expect(cooledGrade('perfect', COOL_STEP_MS * 2)).toBe('cold');
    expect(cooledGrade('good', COOL_STEP_MS)).toBe('cold');
    expect(cooledGrade('cold', COOL_STEP_MS * 10)).toBe('cold');
  });

  it('keeps burnt as burnt', () => {
    expect(cooledGrade('burnt', COOL_STEP_MS * 3)).toBe('burnt');
  });
});
