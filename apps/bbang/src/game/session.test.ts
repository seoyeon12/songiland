import { describe, expect, it } from 'vitest';
import { COOL_STEP_MS, COST, shopConfig, STANDARD_SHOP, type Shift } from '../engine';
import {
  createSession,
  ORDER_PATIENCE_MS,
  reduce,
  START_LIVES,
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

// difficultyAt(0)=0 → cookWindow(0): 초록 [1800,4200]ms, Perfect [2520,3480]ms(가운데 40%).
const PERFECT_MS = 3000;
const BURNT_MS = 4500;

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

  it('hands a cooked one straight to the customer waiting for it', () => {
    const state = run(
      createSession(shiftWith([{ id: 7, atMs: 0, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
    );
    expect(state.pans[0].status).toBe('empty');
    expect(state.rack).toHaveLength(0);
    expect(state.orders).toHaveLength(0);
    expect(state.tally.score).toBe(100);
    expect(state.tally.counts.perfect).toBe(1);
    expect(state.notice).toMatchObject({ kind: 'served', grade: 'perfect', count: 1 });
  });

  it('gives it to whoever has waited longest for that filling', () => {
    const state = run(
      createSession(
        shiftWith([
          { id: 0, atMs: 0, filling: 'custard', count: 1 },
          { id: 1, atMs: 0, filling: 'red-bean', count: 1 },
          { id: 2, atMs: 500, filling: 'red-bean', count: 1 },
        ]),
        SHOP,
      ),
      at(500),
      { type: 'pour', panIndex: 0 },
      at(500 + PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
    );
    expect(state.orders.map((order) => order.id)).toEqual([0, 2]);
  });

  it('racks it when nobody wants that filling, and hands it over when they arrive', () => {
    const racked = run(
      createSession(shiftWith([{ id: 0, atMs: 5000, filling: 'red-bean', count: 2 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
    );
    expect(racked.rack).toEqual([{ id: 0, filling: 'red-bean', grade: 'perfect', rackedAtMs: PERFECT_MS }]);
    expect(racked.notice).toMatchObject({ kind: 'racked', filling: 'red-bean' });

    // 손님이 5초에 오면 거치대에서 바로 받는다. 리플레이처럼 tick이 늦게 와도 등급은 온 시각 기준.
    const arrived = reduce(racked, at(PERFECT_MS + COOL_STEP_MS + 100));
    expect(arrived.rack).toHaveLength(0);
    expect(arrived.orders[0].remaining).toBe(1);
    expect(arrived.tally.counts.perfect).toBe(1);
  });

  it('lets a perfect one cool on the rack while it waits for a customer', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: PERFECT_MS + COOL_STEP_MS, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      at(PERFECT_MS + COOL_STEP_MS),
    );
    expect(state.tally.counts.good).toBe(1);
    expect(state.tally.score).toBe(70);
  });

  it('only hands over the ordered filling', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'custard', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 }, // 기본 소는 팥
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
    );
    expect(state.tally.served).toBe(0);
    expect(state.rack).toHaveLength(1);
    expect(state.orders).toHaveLength(1);
  });

  it('throws a burnt one away straight from the pan, and a rack item on tap', () => {
    const state = run(
      createSession(shiftWith([]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 1 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      at(BURNT_MS),
      { type: 'take-out', panIndex: 1 }, // 탐
    );
    expect(state.burnt).toBe(1);
    expect(state.pans[1].status).toBe('empty');
    expect(state.rack).toHaveLength(1);
    expect(state.notice?.kind).toBe('burnt');

    const trashed = reduce(state, { type: 'discard', itemId: 0 });
    expect(trashed.rack).toHaveLength(0);
    expect(trashed.discarded).toBe(2);
  });

  it('keeps a pan cooking when the rack is full, unless a customer takes it', () => {
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

  it('hands over the best racked ones first, and part of an order if short', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 12_000, filling: 'red-bean', count: 3 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 }, // 0번: 완벽, 손님이 올 땐 식어서 좋음
      at(COOL_STEP_MS),
      { type: 'pour', panIndex: 1 },
      at(COOL_STEP_MS + PERFECT_MS),
      { type: 'take-out', panIndex: 1 }, // 1번: 완벽
      at(12_000),
    );
    expect(state.rack).toHaveLength(0);
    expect(state.orders[0].remaining).toBe(1);
    expect(state.tally.score).toBe(100 + 70); // 완벽 먼저, 그다음 좋음
    expect(state.notice).toMatchObject({ kind: 'served', grade: 'good', count: 2 });
  });

  it('builds a perfect combo', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 3 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 1 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
      { type: 'take-out', panIndex: 1 },
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS * 2),
      { type: 'take-out', panIndex: 0 }, // 완벽 3 (×2)
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

  it('books revenue on every hand-over and ingredient cost on every pour', () => {
    const state = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 1 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 }, // 완벽: 1,000 + 팁 300
      at(BURNT_MS),
      { type: 'take-out', panIndex: 1 }, // 탄 것: 매출 없이 재료비만
    );
    expect(state.revenue).toBe(1300);
    expect(state.cost).toBe(COST['red-bean'] * 2);
  });

  it('uses the upgraded shop: more rack slots, wider green, slower cooling, pricier batter', () => {
    const shop = shopConfig({ rack: 1, pans: 0, batter: 2, warmer: 1 });
    // 표준이면 4,200ms에 초록이 끝나지만, 초록 +20%면 아직 좋음이다.
    const state = run(
      createSession(
        // 표준이면 한 단계 식었을 시각에 손님이 온다. 보온 거치대(11초)면 그대로 좋음.
        shiftWith([{ id: 0, atMs: 4500 + COOL_STEP_MS, filling: 'red-bean', count: 1 }]),
        shop,
      ),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(4500),
      { type: 'take-out', panIndex: 0 },
      at(4500 + COOL_STEP_MS),
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

describe('lives', () => {
  it('loses a life per customer who leaves and per burnt one, and ends at zero', () => {
    const orders = Array.from({ length: START_LIVES - 1 }, (_, id) => ({
      id,
      atMs: 0,
      filling: 'red-bean' as const,
      count: 1,
    }));
    const left = run(createSession(shiftWith(orders), SHOP), at(0), at(ORDER_PATIENCE_MS + 1));
    expect(left.lives).toBe(1);
    expect(left.notice).toMatchObject({ kind: 'missed', count: START_LIVES - 1 });
    expect(left.over).toBe(false);

    const burnt = run(left, { type: 'pour', panIndex: 0 }, at(ORDER_PATIENCE_MS + 1 + BURNT_MS), {
      type: 'take-out',
      panIndex: 0,
    });
    expect(burnt.lives).toBe(0);
    expect(burnt.over).toBe(true);
    // 끝난 뒤의 입력은 무시한다.
    expect(reduce(burnt, { type: 'pour', panIndex: 1 }).pans[1].status).toBe('empty');
  });

  it('never loses lives in practice, and ends once every order is served', () => {
    const shift = shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 1 }]);
    const waited = run(
      createSession(shift, SHOP, { practice: true }),
      at(0),
      { type: 'pour', panIndex: 0 },
      { type: 'pour', panIndex: 1 },
      at(ORDER_PATIENCE_MS * 3),
      { type: 'take-out', panIndex: 0 }, // 탐
    );
    expect(waited.orders).toHaveLength(1);
    expect(waited.lives).toBe(START_LIVES);
    expect(waited.over).toBe(false);
  });
});

describe('session feedback', () => {
  it('marks the take-out moment and reports score changes on notices', () => {
    const base = run(
      createSession(shiftWith([{ id: 0, atMs: 0, filling: 'red-bean', count: 1 }]), SHOP),
      at(0),
      { type: 'pour', panIndex: 1 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 1 },
    );
    expect(base.burst).toEqual({ seq: 1, panIndex: 1, grade: 'perfect', atMs: PERFECT_MS });
    expect(base.notice).toMatchObject({ kind: 'served', points: 100 });
  });

  it('bursts smoke when a burnt one is thrown away', () => {
    const state = run(
      createSession(shiftWith([]), SHOP),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(BURNT_MS),
      { type: 'take-out', panIndex: 0 },
    );
    expect(state.burst).toMatchObject({ seq: 1, panIndex: 0, grade: 'burnt' });
  });

  it('breaks the combo when a customer gives up', () => {
    const state = run(
      createSession(
        shiftWith([
          { id: 0, atMs: 0, filling: 'red-bean', count: 2 },
          { id: 1, atMs: 1000, filling: 'custard', count: 1 },
        ]),
        SHOP,
      ),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(PERFECT_MS),
      { type: 'take-out', panIndex: 0 },
    );
    expect(state.tally.streak).toBe(1);
    const left = reduce(state, at(1000 + ORDER_PATIENCE_MS + 1));
    expect(left.tally.streak).toBe(0);
    expect(left.notice?.kind).toBe('missed');
  });
});
