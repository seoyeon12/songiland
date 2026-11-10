/** 붕어빵 랭킹전 엔진 공통 타입. 엔진은 React·DOM·시계에 기대지 않는 순수 TypeScript다. */

/** 소. 팥·슈크림으로 시작하고, 장사 후반에 고구마가 더해진다(5.3). */
export type FillingId = 'red-bean' | 'custard' | 'sweet-potato';

/**
 * 틀 위 붕어빵의 익힘 상태. 반죽은 한번 부으면 빼낼 수 없어서, 초록 구간 전('raw')에는 꺼낼 수
 * 없고 다 굽거나(완벽·좋음) 태우거나(탐) 둘 중 하나다.
 */
export type Doneness = 'raw' | 'perfect' | 'good' | 'burnt';

/**
 * 꺼낸 붕어빵의 등급. 틀에서 꺼낼 때 완벽·좋음·탐으로 정해지고, 거치대에 오래 두면
 * 완벽 → 좋음 → 식음으로 내려간다(탄 것은 그대로 탐).
 */
export type Grade = 'perfect' | 'good' | 'cold' | 'burnt';

/** 손님이 받아 주는 등급(탄 붕어빵은 거절한다). */
export type ServedGrade = Exclude<Grade, 'burnt'>;

/** 손님 주문 하나. 들어오는 시각과 소·개수. */
export type Order = {
  id: number;
  /** 주문이 들어오는 시각(ms, 장사 시작 = 0). */
  atMs: number;
  filling: FillingId;
  /** 주문 개수. */
  count: number;
};

/** 한 판(90초) 장사 설정. 시드로 결정되어, 같은 날이면 모두 같은 장사를 받는다. */
export type Shift = {
  seed: number;
  durationMs: number;
  orders: readonly Order[];
};

/** 한 조각이 익는 구간(반죽 부은 때로부터의 ms). 난이도가 높을수록 좁고 빠르다. */
export type CookWindow = {
  /** 초록(제 타이밍) 구간. */
  greenStartMs: number;
  greenEndMs: number;
  /** Perfect가 나오는 초록 한가운데 구간. */
  perfectStartMs: number;
  perfectEndMs: number;
};
