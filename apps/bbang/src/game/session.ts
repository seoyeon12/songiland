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

/** 처음 목숨. 손님이 떠나거나 붕어빵을 태울 때마다 하나씩 잃고, 다 잃으면 장사가 끝난다. */
export const START_LIVES = 5;

/** 고구마가 열리는 진행도(shift.fillingsAt과 같은 기준). */
export const LATE_FILLING_FROM = 0.5;

/**
 * 규칙 버전. 저장된 고스트(입력 로그)는 같은 규칙에서만 다시 돌릴 수 있어서, 규칙을 바꾸면
 * 올린다. (1 = 탭 한 번에 꺼내서 서빙, 2 = 거치대·쓰레기통·식음, 3 = 주문 카드 한 번에 봉투 포장·탄 건 바로 버림·목숨 5개,
 * 4 = 5단계 밸런스: Perfect 구간 40%·손님이 떠나면 콤보 끊김·막판 주문 간격)
 */
export const RULES_VERSION = 4;

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

/** 방금 일어난 일(화면 피드백용). seq가 바뀌면 새 알림이다. points는 이 일로 바뀐 점수. */
export type Notice = { seq: number } & (
  /** grade = 봉투에서 가장 낮은 등급, count = 건넨 개수. */
  | { kind: 'served'; grade: ServedGrade; count: number; multiplier: number; points: number }
  | { kind: 'none-ready'; filling: FillingId }
  | { kind: 'mismatch' }
  | { kind: 'burnt' }
  | { kind: 'missed'; count: number }
  | { kind: 'raw' }
  | { kind: 'rack-full' }
  | { kind: 'discarded' }
);

/** 플레이어 입력. 시계(tick)는 입력이 아니다. */
export type Input =
  | { type: 'select'; filling: FillingId }
  | { type: 'pour'; panIndex: number }
  | { type: 'take-out'; panIndex: number }
  | { type: 'serve'; orderId: number }
  | { type: 'give'; itemId: number; orderId: number }
  | { type: 'discard'; itemId: number };

export type Action = { type: 'tick'; nowMs: number } | Input;

/** 틀에서 막 꺼낸 순간(손맛 피드백용: 히트스톱·반짝임·연기). seq가 바뀌면 새 순간이다. */
export type Burst = { seq: number; panIndex: number; grade: Grade; atMs: number };

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
  orders: OpenOrder[];
  /** 다음에 받을 shift.orders 인덱스. */
  admitted: number;
  selected: FillingId;
  tally: Tally;
  /** 탄 채로 꺼낸 붕어빵 수. */
  burnt: number;
  /** 버린 붕어빵 수(탄 것 포함). */
  discarded: number;
  /** 손님이 기다리다 떠난 주문 수. */
  missedOrders: number;
  /** 남은 목숨. 0이 되면 장사가 끝난다. */
  lives: number;
  /**
   * 연습(튜토리얼) 판: 손님이 떠나지 않고 목숨도 줄지 않으며, 주문을 다 받으면 끝난다.
   * 기록·고스트·포인트에 쓰지 않는다.
   */
  practice: boolean;
  /** 매출(원): 손님이 받아 준 붕어빵 판매가·팁 합. 점수와 따로 센다. */
  revenue: number;
  /** 재료비(원): 반죽을 부을 때마다 나간다(태우거나 버려도). */
  cost: number;
  notice: Notice | null;
  burst: Burst | null;
  inputs: LoggedInput[];
  over: boolean;
};

export function createSession(
  shift: Shift,
  shop: ShopConfig = STANDARD_SHOP,
  { practice = false }: { practice?: boolean } = {},
): SessionState {
  return {
    shift,
    shop,
    elapsedMs: 0,
    pans: Array.from({ length: shop.pans }, () => ({ status: 'empty' as const })),
    rack: [],
    nextItemId: 0,
    orders: [],
    admitted: 0,
    selected: 'red-bean',
    tally: emptyTally(),
    burnt: 0,
    discarded: 0,
    missedOrders: 0,
    lives: START_LIVES,
    practice,
    revenue: 0,
    cost: 0,
    notice: null,
    burst: null,
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
  if (state.over) {
    // 목숨을 다 잃어 일찍 끝났으면 시계도 멈춘다(다시 돌려도 같은 결과).
    return state;
  }
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

  // 오래 기다린 주문은 떠나고, 떠난 손님마다 목숨을 하나 잃는다(연습 판은 안 떠난다).
  const kept: OpenOrder[] = [];
  let missed = 0;
  // 남은 목숨보다 많이 떠나지는 않는다: 마지막 목숨을 잃는 순간 장사가 끝나므로, 리플레이처럼
  // tick 간격이 넓어도 촘촘히 돌린 판과 같은 수가 나온다.
  for (const order of [...state.orders, ...incoming]) {
    const expired = elapsedMs - order.arrivedAtMs > ORDER_PATIENCE_MS;
    if (!state.practice && expired && missed < state.lives) {
      missed += 1;
    } else {
      kept.push(order);
    }
  }

  const next: SessionState = {
    ...state,
    elapsedMs,
    admitted,
    orders: kept,
    missedOrders: state.missedOrders + missed,
    lives: Math.max(0, state.lives - missed),
  };
  if (missed === 0) {
    return withEnd(next);
  }
  // 손님을 떠나보내면 콤보도 끊긴다(5단계: 굽기만 잘하고 손님을 놓치는 플레이를 막는다).
  return withNotice(withEnd({ ...next, tally: { ...next.tally, streak: 0 } }), {
    kind: 'missed',
    count: missed,
  });
}

/** 시간이 다 됐거나 목숨을 다 잃었거나, 연습 판이면 주문을 다 받았을 때 장사를 끝낸다. */
function withEnd(state: SessionState): SessionState {
  const allServed =
    state.practice && state.admitted >= state.shift.orders.length && state.orders.length === 0;
  const over = state.elapsedMs >= state.shift.durationMs || state.lives <= 0 || allServed;
  return over === state.over ? state : { ...state, over };
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

/**
 * 틀에서 꺼내 거치대에 올린다. 덜 익었으면 못 꺼내고, 탄 건 바로 버리며,
 * 거치대가 꽉 차면 틀에서 계속 익는다.
 */
function takeOut(state: SessionState, panIndex: number): SessionState {
  const pan = state.pans[panIndex];
  if (!pan || pan.status !== 'cooking') {
    return state;
  }
  const doneness = panDoneness(pan, state.elapsedMs, state.shop);
  if (doneness === 'raw') {
    return withNotice(state, { kind: 'raw' });
  }
  const emptied = state.pans.map((entry, index) =>
    index === panIndex ? ({ status: 'empty' } as const) : entry,
  );
  const burst: Burst = {
    seq: (state.burst?.seq ?? 0) + 1,
    panIndex,
    grade: doneness,
    atMs: state.elapsedMs,
  };
  if (doneness === 'burnt') {
    // 탄 건 거치대에 올리지 않고 바로 버리고, 목숨을 하나 잃는다(연습 판은 안 잃는다).
    return withEnd(
      withNotice(
        {
          ...state,
          pans: emptied,
          burst,
          burnt: state.burnt + 1,
          discarded: state.discarded + 1,
          lives: state.practice ? state.lives : Math.max(0, state.lives - 1),
        },
        { kind: 'burnt' },
      ),
    );
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
    pans: emptied,
    rack: [...state.rack, item],
    nextItemId: state.nextItemId + 1,
    burst,
  };
}

const GRADE_RANK: Record<ServedGrade, number> = { perfect: 2, good: 1, cold: 0 };

/** 이 주문에 지금 건넬 거치대 붕어빵들: 같은 소 중 등급 높은 것부터(같으면 먼저 꺼낸 것), 남은 개수만큼. */
export function packFor(
  order: OpenOrder,
  rack: readonly RackItem[],
  elapsedMs: number,
  shop: ShopConfig,
): { item: RackItem; grade: ServedGrade }[] {
  return rack
    .filter((item) => item.filling === order.filling)
    .map((item) => ({ item, grade: rackGrade(item, elapsedMs, shop) as ServedGrade }))
    .sort((a, b) => GRADE_RANK[b.grade] - GRADE_RANK[a.grade] || a.item.id - b.item.id)
    .slice(0, order.remaining);
}

/**
 * 주문 카드를 누르면 거치대에서 그 소를 봉투에 담아 건넨다. 하나씩 채점해 콤보가 이어진다.
 * 거치대에 그 소가 없으면 아무 일 없이 알려 주기만 한다. 모자라면 있는 만큼만 건네고 남은 개수가 준다.
 */
function serve(state: SessionState, orderId: number): SessionState {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) {
    return state;
  }
  const pack = packFor(order, state.rack, state.elapsedMs, state.shop);
  if (pack.length === 0) {
    return withNotice(state, { kind: 'none-ready', filling: order.filling });
  }

  return deliver(state, order, pack);
}

/** 고른 붕어빵들을 봉투에 담아 건넨다. 하나씩 채점해 콤보가 이어진다. */
function deliver(
  state: SessionState,
  order: OpenOrder,
  pack: readonly { item: RackItem; grade: ServedGrade }[],
): SessionState {
  let tally = state.tally;
  let revenue = state.revenue;
  let worst: ServedGrade = 'perfect';
  for (const { item, grade } of pack) {
    tally = applyServe(tally, { grade, matched: true });
    revenue += salePrice(item.filling, grade, state.shop);
    if (GRADE_RANK[grade] < GRADE_RANK[worst]) {
      worst = grade;
    }
  }
  const packed = new Set(pack.map(({ item }) => item.id));
  const orders = state.orders
    .map((entry) =>
      entry.id === order.id ? { ...entry, remaining: entry.remaining - pack.length } : entry,
    )
    .filter((entry) => entry.remaining > 0);
  return withNotice(
    withEnd({
      ...state,
      tally,
      orders,
      revenue,
      rack: state.rack.filter((item) => !packed.has(item.id)),
    }),
    {
      kind: 'served',
      grade: worst,
      count: pack.length,
      multiplier: comboMultiplier(tally.streak),
      points: tally.score - state.tally.score,
    },
  );
}

/**
 * 거치대의 붕어빵 하나를 골라 이 손님에게 건넨다(끌어다 놓기·골라서 누르기).
 * 소가 다르면 벌점 없이 돌려받는다.
 */
function give(state: SessionState, itemId: number, orderId: number): SessionState {
  const item = state.rack.find((entry) => entry.id === itemId);
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!item || !order) {
    return state;
  }
  if (item.filling !== order.filling) {
    return withNotice(state, { kind: 'mismatch' });
  }
  return deliver(state, order, [
    { item, grade: rackGrade(item, state.elapsedMs, state.shop) as ServedGrade },
  ]);
}

/** 거치대의 붕어빵 하나를 버린다(벌점 없음, 칸만 비운다). */
function discard(state: SessionState, itemId: number): SessionState {
  if (!state.rack.some((item) => item.id === itemId)) {
    return state;
  }
  return withNotice(
    {
      ...state,
      rack: state.rack.filter((item) => item.id !== itemId),
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
    case 'serve':
      return serve(state, input.orderId);
    case 'give':
      return give(state, input.itemId, input.orderId);
    case 'discard':
      return discard(state, input.itemId);
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
