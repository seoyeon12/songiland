import { FILLING_IDS } from './data/fillings';
import { clamp01, lerp } from './num';
import { createRng } from './rng';
import type { FillingId, Order, Shift } from './types';

/** 한 판 길이(ms). 시간제 90초(5.5 확정). */
export const SHIFT_MS = 90_000;

/** 첫 주문이 들어오기까지 잠깐 비워 둔다. */
const FIRST_ORDER_MS = 1200;

/** 장사 진행도(0~1)에 따라 쓰는 소: 전반은 팥·슈크림 2종, 후반(0.5~)에 고구마가 더해진다. */
function fillingsAt(progress: number): readonly FillingId[] {
  return progress < 0.5 ? FILLING_IDS.slice(0, 2) : FILLING_IDS;
}

/** 주문 간격(ms): 초반 느긋(4.2초) → 막판 촘촘(1.8초). */
function orderGapMs(progress: number): number {
  return lerp(4200, 1800, progress);
}

/** 장사 진행도에 따른 난이도(0~1). baking.cookWindow에 그대로 넣는다. */
export function difficultyAt(atMs: number): number {
  return clamp01(atMs / SHIFT_MS);
}

/**
 * "오늘의 장사"를 만든다. 같은 시드면 주문 순서·소·개수·타이밍이 똑같이 재현된다.
 * 주문은 장사 시작부터 끝까지 흐르고, 진행될수록 자주·여러 소로 들어온다.
 */
export function createShift(seed: number): Shift {
  const rng = createRng(seed);
  const orders: Order[] = [];
  let atMs = FIRST_ORDER_MS;
  let id = 0;
  while (atMs < SHIFT_MS) {
    const progress = atMs / SHIFT_MS;
    const filling = rng.pick(fillingsAt(progress));
    const count = rng.intRange(1, progress < 0.5 ? 2 : 3);
    orders.push({ id, atMs: Math.round(atMs), filling, count });
    id += 1;
    atMs += orderGapMs(progress) * rng.range(0.8, 1.2);
  }
  return { seed, durationMs: SHIFT_MS, orders };
}

/** 'YYYY-MM-DD'(UTC). 전 세계가 같은 날 같은 판을 받도록 현지 자정이 아니라 UTC로 통일한다. */
export function dailyKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 오늘(UTC) 날짜로 만든 일일 챌린지 시드. 같은 날이면 시간대·시각과 무관하게 어디서나 같다.
 * 날짜 숫자(YYYYMMDD)를 32비트로 섞어 시드로 쓴다.
 */
export function dailySeed(date: Date): number {
  const key = date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  let t = (key ^ 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
