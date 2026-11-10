import {
  applyServe,
  comboMultiplier,
  cookWindow,
  cooledGrade,
  difficultyAt,
  emptyTally,
  ingredientCost,
  judge,
  salePrice,
  serveOutcome,
  STANDARD_SHOP,
  type Doneness,
  type FillingId,
  type Grade,
  type ServedGrade,
  type Shift,
  type ShopConfig,
  type Tally,
} from '../engine';

/** 손님이 기다려 주는 시간(ms). 넘으면 주문을 접고 떠난다. */
export const ORDER_PATIENCE_MS = 13_000;

/** 고구마가 열리는 진행도(shift.fillingsAt과 같은 기준). */
export const LATE_FILLING_FROM = 0.5;

/**
 * 규칙 버전. 저장된 고스트(입력 로그)는 같은 규칙에서만 다시 돌릴 수 있어서, 규칙을 바꾸면
 * 올린다. (1 = 탭 한 번에 꺼내서 서빙, 2 = 거치대·쓰레기통·식음)
 */
export const RULES_VERSION = 2;

export type Pan =
  | { status: 'empty' }
  | { status: 'cooking'; filling: FillingId; pouredAtMs: number };

/** 거치대에 올린 붕어빵. 꺼낼 때의 등급(grade)에서 시간이 지나면 식는다(rackGrade). */
export type RackItem = { id: number; filling: FillingId; grade: Grade; rackedAtMs: number };

export type OpenOrder = {
  id: number;
  filling: FillingId;
  remaining: number;
  arrivedAtMs: number;
};

/** 방금 일어난 일(화면 피드백용). seq가 바뀌면 새 알림이다. */
export type Notice = { seq: number } & (
  | { kind: 'served'; grade: ServedGrade; multiplier: number }
  | { kind: 'mismatch' }
  | { kind: 'burnt-serve' }
  | { kind: 'raw' }
  | { kind: 'rack-full' }
  | { kind: 'discarded' }
  | { kind: 'pick-first' }
);

/** 플레이어 입력. 시계(tick)는 입력이 아니다. */
export type Input =
  | { type: 'select'; filling: FillingId }
  | { type: 'pour'; panIndex: number }
  | { type: 'take-out'; panIndex: number }
  | { type: 'pick'; itemId: number }
  | { type: 'serve'; orderId: number }
  | { type: 'discard' };

export type Action = { type: 'tick'; nowMs: number } | Input;

/** 언제(장사 시작부터 ms) 어떤 입력을 했는지. 같은 장사에 다시 넣으면 판이 그대로 재현된다(고스트). */
export type LoggedInput = { atMs: number; input: Input };

export type SessionState = {
  shift: Shift;
  /** 가게 설정(틀·거치대 칸 수 등). 오늘의 장사는 표준 가게, '내 가게'는 업그레이드 반영. */
  shop: ShopConfig;
  elapsedMs: number;
  pans: Pan[];
  rack: RackItem[];
  nextItemId: number;
  /** 거치대에서 고른 붕어빵 id. 고른 뒤 주문 카드나 쓰레기통을 누른다. */
  picked: number | null;
  orders: OpenOrder[];
  /** 다음에 받을 shift.orders 인덱스. */
  admitted: number;
  selected: FillingId;
  tally: Tally;
  /** 탄 채로 꺼낸 붕어빵 수. */
  burnt: number;
  /** 쓰레기통에 버린 붕어빵 수. */
  discarded: number;
  /** 손님이 기다리다 떠난 주문 수. */
  missedOrders: number;
  /** 매출(원): 손님이 받아 준 붕어빵 판매가·팁 합. 점수와 따로 센다. */
  revenue: number;
  /** 재료비(원): 반죽을 부을 때마다 나간다(태우거나 버려도). */
  cost: number;
  notice: Notice | null;
  inputs: LoggedInput[];
  over: boolean;
};

export function createSession(shift: Shift, shop: ShopConfig = STANDARD_SHOP): SessionState {
  return {
    shift,
    shop,
    elapsedMs: 0,
    pans: Array.from({ length: shop.pans }, () => ({ status: 'empty' as const })),
    rack: [],
    nextItemId: 0,
    picked: null,
    orders: [],
    admitted: 0,
    selected: 'red-bean',
    tally: emptyTally(),
    burnt: 0,
    discarded: 0,
    missedOrders: 0,
    revenue: 0,
    cost: 0,
    notice: null,
    inputs: [],
    over: false,
  };
}

/** 지금 진행도에서 쓸 수 있는 소인지(고구마는 후반부터). */
export function fillingUnlocked(filling: FillingId, elapsedMs: number, durationMs: number): boolean {
  if (filling !== 'sweet-potato') {
    return true;
  }
  return elapsedMs / durationMs >= LATE_FILLING_FROM;
}

/** 틀 위 붕어빵의 익힘. 반죽 부은 때의 난이도로 구간을 고정해, 게이지와 판정이 어긋나지 않게 한다. */
export function panDoneness(
  pan: Extract<Pan, { status: 'cooking' }>,
  elapsedMs: number,
  shop: ShopConfig,
): Doneness {
  return judge(panWindow(pan, shop), elapsedMs - pan.pouredAtMs);
}

/** 이 틀의 익힘 구간(반죽 부은 때의 난이도 + 가게의 반죽 등급). */
export function panWindow(pan: Extract<Pan, { status: 'cooking' }>, shop: ShopConfig) {
  return cookWindow(difficultyAt(pan.pouredAtMs), shop.greenWidthBonus);
}

/** 거치대 붕어빵의 지금 등급(식음 반영). */
export function rackGrade(item: RackItem, elapsedMs: number, shop: ShopConfig): Grade {
  return cooledGrade(item.grade, elapsedMs - item.rackedAtMs, shop.coolStepMs);
}

function withNotice(state: SessionState, notice: DistributiveOmit<Notice, 'seq'>): SessionState {
  return { ...state, notice: { ...notice, seq: (state.notice?.seq ?? 0) + 1 } as Notice };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function tick(state: SessionState, nowMs: number): SessionState {
  const elapsedMs = Math.min(Math.max(nowMs, state.elapsedMs), state.shift.durationMs);

  // 도착한 주문을 받는다.
  let admitted = state.admitted;
  const incoming: OpenOrder[] = [];
  while (admitted < state.shift.orders.length && state.shift.orders[admitted].atMs <= elapsedMs) {
    const order = state.shift.orders[admitted];
    incoming.push({
      id: order.id,
      filling: order.filling,
      remaining: order.count,
      arrivedAtMs: order.atMs,
    });
    admitted += 1;
  }

  // 오래 기다린 주문은 떠난다.
  const kept: OpenOrder[] = [];
  let missed = 0;
  for (const order of [...state.orders, ...incoming]) {
    if (elapsedMs - order.arrivedAtMs > ORDER_PATIENCE_MS) {
      missed += 1;
    } else {
      kept.push(order);
    }
  }

  return {
    ...state,
    elapsedMs,
    admitted,
    orders: kept,
    missedOrders: state.missedOrders + missed,
    over: elapsedMs >= state.shift.durationMs,
  };
}

function pour(state: SessionState, panIndex: number): SessionState {
  const pan = state.pans[panIndex];
  if (
    !pan ||
    pan.status !== 'empty' ||
    !fillingUnlocked(state.selected, state.elapsedMs, state.shift.durationMs)
  ) {
    return state;
  }
  const pans = state.pans.map((entry, index) =>
    index === panIndex
      ? ({ status: 'cooking', filling: state.selected, pouredAtMs: state.elapsedMs } as const)
      : entry,
  );
  return { ...state, pans, cost: state.cost + ingredientCost(state.selected, state.shop) };
}

/** 틀에서 꺼내 거치대에 올린다. 덜 익었으면 못 꺼내고, 거치대가 꽉 차면 틀에서 계속 익는다. */
function takeOut(state: SessionState, panIndex: number): SessionState {
  const pan = state.pans[panIndex];
  if (!pan || pan.status !== 'cooking') {
    return state;
  }
  const doneness = panDoneness(pan, state.elapsedMs, state.shop);
  if (doneness === 'raw') {
    return withNotice(state, { kind: 'raw' });
  }
  if (state.rack.length >= state.shop.rackSlots) {
    return withNotice(state, { kind: 'rack-full' });
  }
  const item: RackItem = {
    id: state.nextItemId,
    filling: pan.filling,
    grade: doneness,
    rackedAtMs: state.elapsedMs,
  };
  return {
    ...state,
    pans: state.pans.map((entry, index) => (index === panIndex ? { status: 'empty' } : entry)),
    rack: [...state.rack, item],
    nextItemId: state.nextItemId + 1,
    // 고른 게 없으면 방금 꺼낸 것을 바로 골라 둔다(탭 한 번 아끼기).
    picked: state.picked ?? item.id,
    burnt: state.burnt + (doneness === 'burnt' ? 1 : 0),
  };
}

function pick(state: SessionState, itemId: number): SessionState {
  if (!state.rack.some((item) => item.id === itemId)) {
    return state;
  }
  return { ...state, picked: state.picked === itemId ? null : itemId };
}

/** 고른 붕어빵을 이 주문 손님에게 내민다. 다른 소·탄 것은 거절당하고 거치대에 남는다. */
function serve(state: SessionState, orderId: number): SessionState {
  const item = state.rack.find((entry) => entry.id === state.picked);
  if (!item) {
    return withNotice(state, { kind: 'pick-first' });
  }
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) {
    return state;
  }
  const grade = rackGrade(item, state.elapsedMs, state.shop);
  const offer = { grade, matched: order.filling === item.filling };
  const outcome = serveOutcome(offer);
  const tally = applyServe(state.tally, offer);

  if (outcome !== 'accepted') {
    return withNotice(
      { ...state, tally, picked: null },
      { kind: outcome === 'burnt' ? 'burnt-serve' : 'mismatch' },
    );
  }

  const orders = state.orders
    .map((entry) => (entry.id === order.id ? { ...entry, remaining: entry.remaining - 1 } : entry))
    .filter((entry) => entry.remaining > 0);
  const served = grade as ServedGrade;
  return withNotice(
    {
      ...state,
      tally,
      orders,
      revenue: state.revenue + salePrice(item.filling, served, state.shop),
      rack: state.rack.filter((entry) => entry.id !== item.id),
      picked: null,
    },
    { kind: 'served', grade: served, multiplier: comboMultiplier(tally.streak) },
  );
}

/** 고른 붕어빵을 쓰레기통에 버린다(벌점 없음, 칸만 비운다). */
function discard(state: SessionState): SessionState {
  if (!state.rack.some((item) => item.id === state.picked)) {
    return withNotice(state, { kind: 'pick-first' });
  }
  return withNotice(
    {
      ...state,
      rack: state.rack.filter((item) => item.id !== state.picked),
      picked: null,
      discarded: state.discarded + 1,
    },
    { kind: 'discarded' },
  );
}

function applyInput(state: SessionState, input: Input): SessionState {
  switch (input.type) {
    case 'select':
      return state.selected === input.filling ? state : { ...state, selected: input.filling };
    case 'pour':
      return pour(state, input.panIndex);
    case 'take-out':
      return takeOut(state, input.panIndex);
    case 'pick':
      return pick(state, input.itemId);
    case 'serve':
      return serve(state, input.orderId);
    case 'discard':
      return discard(state);
    default:
      return state;
  }
}

/** 순수 리듀서. 판을 바꾼 입력은 입력 로그(inputs)에 남겨, 같은 장사에서 그대로 다시 돌릴 수 있다. */
export function reduce(state: SessionState, action: Action): SessionState {
  if (action.type === 'tick') {
    return tick(state, action.nowMs);
  }
  if (state.over) {
    return state;
  }
  const next = applyInput(state, action);
  if (next === state) {
    return state;
  }
  return { ...next, inputs: [...state.inputs, { atMs: state.elapsedMs, input: action }] };
}
