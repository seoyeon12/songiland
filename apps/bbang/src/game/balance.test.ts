import { describe, expect, it } from 'vitest';
import {
  createRng,
  createShift,
  pointsFor,
  shopConfig,
  STANDARD_SHOP,
  type FillingId,
  type ShopConfig,
} from '../engine';
import {
  createSession,
  panDoneness,
  panWindow,
  rackGrade,
  reduce,
  type Action,
  type SessionState,
} from './session';

/**
 * 밸런스 봇. 반응 간격(reactMs)마다 한 번 움직이고, 꺼내는 타이밍은 Perfect 한가운데에서
 * 대략 ±jitterMs만큼 어긋난다. 우선순위: 익은 틀 꺼내기 → 거치대 처리(탄 것 버리기·주문에
 * 서빙) → 모자란 소를 빈 틀에 붓기.
 *
 * 5단계 측정(30판 평균, 표준 가게):
 *   초보(0.6초·±0.5초) 약 2,300점 · 196P · 손님 12/29 놓침
 *   보통(0.4초·±0.25초) 약 5,600점 · 358P · 최고 콤보 11
 *   고수(0.25초·±0.12초) 약 11,700점 · 497P · 놓친 손님 0
 * 이 표로 Perfect 폭(초록의 40%)·막판 주문 간격(2.2초)·상점 값(다 사면 3,600P)·밈 기준을 정했다.
 */
function bot(seed: number, shop: ShopConfig, reactMs: number, jitterMs: number): SessionState {
  const rng = createRng(seed * 7 + 1);
  const noise = () => (rng.next() + rng.next() + rng.next() - 1.5) * jitterMs * 1.6;
  const targets = new Map<number, number>();
  let s = createSession(createShift(seed), shop);
  let now = 0;
  let nextAct = 0;

  const act = (action: Action): boolean => {
    const next = reduce(s, action);
    if (next === s) {
      return false;
    }
    s = next;
    nextAct = now + reactMs;
    return true;
  };

  const step = () => {
    for (const [index, pan] of s.pans.entries()) {
      if (pan.status !== 'cooking') {
        continue;
      }
      if (!targets.has(index)) {
        const w = panWindow(pan, s.shop);
        targets.set(index, pan.pouredAtMs + (w.perfectStartMs + w.perfectEndMs) / 2 + noise());
      }
      if (now >= targets.get(index)! || panDoneness(pan, now, s.shop) === 'burnt') {
        if (act({ type: 'take-out', panIndex: index })) {
          targets.delete(index);
          return;
        }
      }
    }
    for (const item of s.rack) {
      const burnt = rackGrade(item, s.elapsedMs, s.shop) === 'burnt';
      const order = s.orders.find((entry) => entry.filling === item.filling);
      if (!burnt && !order) {
        continue;
      }
      if (s.picked !== item.id) {
        act({ type: 'pick', itemId: item.id });
      } else {
        act(burnt ? { type: 'discard' } : { type: 'serve', orderId: order!.id });
      }
      return;
    }
    const empty = s.pans.findIndex((pan) => pan.status === 'empty');
    if (empty < 0) {
      return;
    }
    const need = new Map<FillingId, number>();
    const add = (filling: FillingId, n: number) => need.set(filling, (need.get(filling) ?? 0) + n);
    s.orders.forEach((order) => add(order.filling, order.remaining));
    s.pans.forEach((pan) => pan.status === 'cooking' && add(pan.filling, -1));
    s.rack.forEach((item) => add(item.filling, -1));
    const want = [...need].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
    if (want) {
      act(s.selected === want[0] ? { type: 'pour', panIndex: empty } : { type: 'select', filling: want[0] });
    }
  };

  while (!s.over) {
    now += 16;
    s = reduce(s, { type: 'tick', nowMs: now });
    if (now >= nextAct) {
      step();
    }
  }
  return s;
}

function average(shop: ShopConfig, reactMs: number, jitterMs: number) {
  const runs = Array.from({ length: 30 }, (_, i) => bot(20261100 + i, shop, reactMs, jitterMs));
  const avg = (f: (s: SessionState) => number) => runs.reduce((sum, s) => sum + f(s), 0) / runs.length;
  return {
    score: avg((s) => s.tally.score),
    points: avg((s) => pointsFor(s.revenue, s.cost)),
    bestStreak: avg((s) => s.tally.bestStreak),
    missedShare: avg((s) => s.missedOrders / s.shift.orders.length),
  };
}

describe('balance (5단계 측정 기준선)', () => {
  const beginner = average(STANDARD_SHOP, 600, 500);
  const regular = average(STANDARD_SHOP, 400, 250);
  const expert = average(STANDARD_SHOP, 250, 120);

  it('rewards skill: 초보 < 보통 < 고수, with a wide spread for ranking', () => {
    expect(beginner.score).toBeLessThan(regular.score);
    expect(regular.score).toBeLessThan(expert.score);
    expect(expert.score / beginner.score).toBeGreaterThan(3);
  });

  it('keeps a 보통 player breaking combos sometimes', () => {
    expect(regular.bestStreak).toBeLessThan(20);
  });

  it('earns roughly 200–500P a shift, so the shop takes about ten shifts', () => {
    expect(beginner.points).toBeGreaterThan(120);
    expect(expert.points).toBeLessThan(650);
    expect(3600 / regular.points).toBeGreaterThan(7);
    expect(3600 / regular.points).toBeLessThan(14);
  });

  it('lets a 고수 serve almost everyone', () => {
    expect(expert.missedShare).toBeLessThan(0.1);
  });

  it('makes a fully upgraded 내 가게 better but not a different game', () => {
    const upgraded = average(shopConfig({ rack: 2, pans: 2, batter: 2, warmer: 2 }), 400, 250);
    expect(upgraded.score).toBeGreaterThan(regular.score);
    expect(upgraded.score / regular.score).toBeLessThan(1.5);
  });
});
