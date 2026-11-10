import { describe, expect, it } from 'vitest';
import { COOL_STEP_MS, COST, shopConfig, STANDARD_SHOP, type Shift } from '../engine';
import {
  createSession,
  ORDER_PATIENCE_MS,
  reduce,
  type Action,
  type SessionState,
} from './session';

/** 통제된 테스트용 장사. */
function shiftWith(orders: Shift['orders']): Shift {
  return { seed: 0, durationMs: 90_000, orders };
}

/** 틀 2칸짜리 표준 가게(테스트를 짧게). */
const SHOP = { ...STANDARD_SHOP, pans: 2 };
const RACK_SLOTS = STANDARD_SHOP.rackSlots;

function run(state: SessionState, ...actions: Action[]): SessionState {
  return actions.reduce(reduce, state);
}

const at = (nowMs: number): Action => ({ type: 'tick', nowMs });

// difficultyAt(0)=0 → cookWindow(0): 초록 [3200,5600]ms, Perfect [3800,5000]ms.
const PERFECT_MS = 4400;
const BURNT_MS = 6000;

describe('session', () => {
  it('admits orders once they arrive and expires ones that wait too long', () => {
    const start = createSession(shiftWith([{ id: 0, atMs: 500, filling: 'red-bean', count: 1 }]), SHOP);
    expect(reduce(start, at(0)).orders).toHaveLength(0);

    const admitted = reduce(start, at(500));
    expect(admitted.orders).toHaveLength(1);

    const expired = reduce(admitted, at(500 + ORDER_PATIENCE_MS + 1));
    expect(expired.orders).toHaveLength(0);
    expect(expired.missedOrders).toBe(1);
  });

  it('cannot take batter out before it is cooked', () => {
    const state = run(
      createSession(shiftWith([]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(1000),
      { type: 'take-out', panIndex: 0 },
    );
    expect(state.pans[0].status).toBe('cooking');
    expect(state.rack).toHaveLength(0);
    expect(state.notice?.kind).toBe('raw');
  });

  it('takes a cooked one onto the rack, auto-picks it, then serves it to an order', () => {
    const state = run(
      createSession(shiftWith([{ id: 7, atMs: 0, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
    );
    expect(state.pans[0].status).toBe('empty');
    expect(state.rack).toEqual([{ id: 0, filling: 'red-bean', grade: 'perfect', rackedAtMs: PERFECT_MS }]);
    expect(state.picked).toBe(0);

    const served = reduce(state, { type: 'serve', orderId: 7 });
    expect(served.tally.score).toBe(100);
    expect(served.tally.counts.perfect).toBe(1);
    expect(served.rack).toHaveLength(0);
    expect(served.orders).toHaveLength(0);
    expect(served.picked).toBeNull();
  });

  it('lets a perfect one cool on the rack before serving', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      at(PERFECT_MS + COOL_STEP_MS),
      { type: 'serve', orderId: 0 },
    );
    expect(state.tally.counts.good).toBe(1);
    expect(state.tally.score).toBe(70);
  });

  it('refuses a wrong filling and keeps it on the rack', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'custard', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 }, // 기본 소는 팥
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      { type: 'serve', orderId: 0 },
    );
    expect(state.tally.mismatches).toBe(1);
    expect(state.tally.served).toBe(0);
    expect(state.rack).toHaveLength(1);
    expect(state.orders).toHaveLength(1);
    expect(state.notice?.kind).toBe('mismatch');
  });

  it('penalises serving a burnt one; the trash bin clears it for free', () => {
    const base = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 2 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 1 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      { type: 'serve', orderId: 0 }, // +100
      at(BURNT_MS),
      { type: 'take-out', panIndex: 1 }, // 탐
    );
    expect(base.burnt).toBe(1);
    expect(base.rack[0].grade).toBe('burnt');

    const served = reduce(base, { type: 'serve', orderId: 0 });
    expect(served.tally.score).toBe(50); // 100 - 50
    expect(served.tally.burntServes).toBe(1);
    expect(served.rack).toHaveLength(1); // 거절당해 남는다

    const trashed = run(base, { type: 'discard' });
    expect(trashed.tally.score).toBe(100);
    expect(trashed.rack).toHaveLength(0);
    expect(trashed.discarded).toBe(1);
  });

  it('keeps a pan cooking when the rack is full', () => {
    let state = run(createSession(shiftWith([]), { ...SHOP, pans: RACK_SLOTS + 1 }), at(0));
    for (let i = 0; i <= RACK_SLOTS; i += 1) {
      state = reduce(state, { type: 'pour', panIndex: i });
    }
    state = reduce(state, at(PERFECT_MS));
    for (let i = 0; i <= RACK_SLOTS; i += 1) {
      state = reduce(state, { type: 'take-out', panIndex: i });
    }
    expect(state.rack).toHaveLength(RACK_SLOTS);
    expect(state.pans[RACK_SLOTS].status).toBe('cooking');
    expect(state.notice?.kind).toBe('rack-full');
  });

  it('asks to pick first when nothing is picked', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'serve', orderId: 0 },
    );
    expect(state.notice?.kind).toBe('pick-first');
  });

  it('builds a perfect combo', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 3 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 1 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      { type: 'serve', orderId: 0 }, // 완벽 1
      { type: 'take-out', panIndex: 1 },
      { type: 'serve', orderId: 0 }, // 완벽 2
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS * 2),
      { type: 'take-out', panIndex: 0 },
      { type: 'serve', orderId: 0 }, // 완벽 3 (×2)
    );
    expect(state.tally.bestStreak).toBe(3);
    expect(state.tally.score).toBe(400);
  });

  it('refuses to pour a locked filling early', () => {
    const state = run(
      createSession(shiftWith([]), SHOP),
      at(1000),
      { type: 'select', filling: 'sweet-potato' },
      { type: 'pour', panIndex: 0 },
    );
    expect(state.pans[0].status).toBe('empty');
  });

  it('logs only inputs that changed the game, with their time', () => {
    const state = run(
      createSession(shiftWith([]), SHOP),
      at(300),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 0 }, // 이미 굽는 중 → 무시
      at(900),
      { type: 'select', filling: 'custard' },
    );
    expect(state.inputs).toEqual([
      { atMs: 300, input: { type: 'pour', panIndex: 0 } },
      { atMs: 900, input: { type: 'select', filling: 'custard' } },
    ]);
  });

  it('books revenue on accepted serves and ingredient cost on every pour', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 1 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      { type: 'serve', orderId: 0 }, // 완벽: 1,000 + 팁 300
      at(BURNT_MS),
      { type: 'take-out', panIndex: 1 },
      { type: 'discard' }, // 탄 것: 매출 없이 재료비만
    );
    expect(state.revenue).toBe(1300);
    expect(state.cost).toBe(COST['red-bean'] * 2);
  });

  it('uses the upgraded shop: more rack slots, wider green, slower cooling, pricier batter', () => {
    const shop = shopConfig({ rack: 1, pans: 0, batter: 2, warmer: 1 });
    // 표준이면 5,600ms에 초록이 끝나지만, 초록 +20%면 아직 좋음이다.
    // 손님은 늦게 와서 거치대에서 오래 기다린 붕어빵을 받는다(인내 시간 안).
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 5000, filling: 'red-bean', count: 1 }]), shop),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(5800),
      { type: 'take-out', panIndex: 0 },
      at(5800 + COOL_STEP_MS), // 표준이면 한 단계 식었을 시간, 보온 거치대(11초)면 그대로
      { type: 'serve', orderId: 0 },
    );
    expect(state.shop.rackSlots).toBe(4);
    expect(state.tally.counts.good).toBe(1);
    expect(state.revenue).toBe(1000 + 100 + 200); // 판매가 + 좋음 팁 + 비싼 반죽
    expect(state.cost).toBe(COST['red-bean'] + 100);
  });

  it('ends the shift at the duration and ignores inputs after', () => {
    const state = run(createSession(shiftWith([]), SHOP), at(90_000), { type: 'pour', panIndex: 0 });
    expect(state.over).toBe(true);
    expect(state.pans[0].status).toBe('empty');
  });
});
