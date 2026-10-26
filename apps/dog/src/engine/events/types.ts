import type {
  CoatType,
  HealthTendency,
  Route,
  Size,
  Stage,
  StatKey,
  TraitId,
  Tone,
} from '../types';

/** 'rapport'는 짝과의 사이(pair 사건에서만). */
export type BoundKey = StatKey | 'ease' | 'rapport';
type Bound = Partial<Record<BoundKey, number>>;

/** 사건이 나올 수 있는 조건. 적힌 조건을 모두 만족해야 한다. */
export type Condition = {
  breeds?: readonly string[];
  nicknames?: readonly string[];
  routes?: readonly Route[];
  sizes?: readonly Size[];
  coatTypes?: readonly CoatType[];
  /** 견종 건강 경향 중 하나라도 있으면 */
  health?: readonly HealthTendency[];
  /** 성격 중 하나라도 있으면 */
  traits?: readonly TraitId[];
  /** 강아지 표시를 모두 가지고 있으면 */
  requires?: readonly string[];
  /** 강아지 표시를 하나도 가지고 있지 않으면 */
  excludes?: readonly string[];
  /** 가정 표시 중 하나라도 있으면 */
  household?: readonly string[];
  householdExcludes?: readonly string[];
  min?: Bound;
  max?: Bound;
  /** 함께한 개월 수 범위 */
  minTogether?: number;
  maxTogether?: number;
  /** 짝 사건: 짝의 생애 단계가 이 중 하나일 때 */
  partnerStages?: readonly Stage[];
  /** 짝 사건: 이 아이가 짝보다 먼저 가족이 됐을 때 */
  firstInHouse?: boolean;
};

export type Effects = {
  health?: number;
  happiness?: number;
  bond?: number;
  sociability?: number;
  ease?: number;
  /** 수명(개월) 증감 */
  lifespan?: number;
  flags?: readonly string[];
  householdFlags?: readonly string[];
  /** 치료할 수 없는 병: 남은 수명을 [최소, 최대] 개월 안으로 줄이고 'terminal-illness' 표시를 단다. */
  terminal?: readonly [number, number];
  /** 이 달에 무지개다리를 건넌다. 안락사 선택지에만 허용된다(데이터 테스트로 강제). */
  pass?: boolean;
  /** 짝과의 사이 증감(pair 사건). */
  rapport?: number;
  /** 능력치 변화를 짝에게도 똑같이 준다(pair 사건). */
  shared?: boolean;
  /**
   * 새 식구를 만난다. 이 결과가 있는 사건은 견생에서 두 번까지, 가족이 셋보다 적을 때만
   * 나온다(엔진이 막는다).
   * 이름은 플레이어가 짓는다. senior는 보호소의 나이 지긋한 아이.
   */
  adopt?: { route: Route; senior?: boolean };
};

export type Outcome = {
  weight: number;
  /** 이 능력치(또는 짝과의 사이)가 높을수록 이 결과가 나올 확률이 높다. */
  favoredBy?: StatKey | 'rapport';
  /** 이 능력치(또는 짝과의 사이)가 높을수록 이 결과가 나올 확률이 낮다. */
  hinderedBy?: StatKey | 'rapport';
  text: string;
  effects?: Effects;
  follow?: { event: string; inMonths: number };
  memorable?: boolean;
};

/** 'euthanasia'는 노견·불치병·낮은 건강일 때만, 자동 결정이 고르지 않는 선택지에만 붙는다. */
export type ChoiceTag = 'euthanasia';

export type Choice = {
  id: string;
  label: string;
  tags?: readonly ChoiceTag[];
  /** 자동 결정이 이 선택지를 고를 가중치(기본 1, 0이면 자동으로 고르지 않음). */
  autoWeight?: number;
  outcomes: readonly Outcome[];
};

/** family는 견주 가정의 일(이사·이직·아기·여행), multi는 다견가정(새 식구·두 아이 사건). */
export type EventCategory = 'daily' | 'growth' | 'health' | 'family' | 'multi' | 'senior';

export type EventCard = {
  id: string;
  category: EventCategory;
  tones: readonly Tone[];
  stages: readonly Stage[];
  when?: Condition;
  /**
   * 두 아이가 함께하는 사건. 함께 사는 다른 아이 하나가 짝이 되고 문장에서 {other}로 부른다.
   * 짝이 없으면 일어나지 않는다.
   */
  pair?: boolean;
  /** 기본 1 */
  weight?: number;
  /** 이 성격이면 가중치 3배 */
  boostTraits?: readonly TraitId[];
  /** 한 번만 일어난다. 선택 사건의 기본값은 true. */
  once?: boolean;
  /** 강아지마다가 아니라 집에 한 번 일어나는 일(이사·아기 탄생·새 식구 등). */
  household?: boolean;
  /** 다시 일어나기까지 최소 개월 수(once가 아닐 때). 기본 24. */
  cooldown?: number;
  /** 조건이 맞으면 매달 이 확률로 다른 사건보다 먼저 일어난다. */
  urgent?: { chance: number };
  alwaysAsk?: boolean;
  memorable?: boolean;
  /** 문장 변형. {name}, {name:이/가}, 짝은 {other}, {other:과/와} 같은 자리표시를 쓴다. */
  text: readonly string[];
  /** 선택지가 없는 사건의 효과. */
  effects?: Effects;
  choices?: readonly Choice[];
};
