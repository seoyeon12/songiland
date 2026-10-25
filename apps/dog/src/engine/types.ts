/** 견생극장 엔진 공통 타입. 엔진은 React·DOM·시계에 기대지 않는 순수 TypeScript다. */

export type Size = 'toy' | 'small' | 'medium' | 'large';
export type EarShape = 'erect' | 'folded' | 'drop';
export type CoatType = 'short' | 'long' | 'curly' | 'wire';
export type TailShape = 'curled' | 'straight' | 'short';
export type LegLength = 'normal' | 'short';
export type CoatPattern = 'solid' | 'spots' | 'patch' | 'tan-points' | 'chest' | 'saddle';

export type HealthTendency =
  | 'patella'
  | 'dental'
  | 'heart'
  | 'eye'
  | 'trachea'
  | 'alopecia'
  | 'skin'
  | 'stone'
  | 'brachycephalic'
  | 'disc'
  | 'obesity'
  | 'hip'
  | 'tumor'
  | 'pancreas'
  | 'ear'
  | 'spine';

export type Coat = {
  id: string;
  /** 화면에 보이는 털색 이름. 진도·믹스견은 백구·황구 같은 이름을 쓴다. */
  label: string;
  main: string;
  accent?: string;
  pattern: CoatPattern;
};

/** 만남 경로와 별칭 규칙에 쓰는 견종 계열. */
export type BreedFamily = 'mix' | 'jindo' | 'purebred';

export type Breed = {
  id: string;
  name: string;
  family: BreedFamily;
  size: Size;
  /** 기대 수명 범위(년). 일반적인 경향을 단순화한 값이다. */
  lifespanYears: readonly [number, number];
  /** 만남 뽑기 가중치. 국내 동물등록 비율을 대략 따른다. */
  weight: number;
  health: readonly HealthTendency[];
  coats: readonly Coat[];
  ears: readonly EarShape[];
  coatTypes: readonly CoatType[];
  tails: readonly TailShape[];
  legs: LegLength;
  intro: string;
};

export type Look = {
  ears: EarShape;
  coatType: CoatType;
  tail: TailShape;
  legs: LegLength;
};

export type Sex = 'male' | 'female';

export type TraitId =
  | 'foodie'
  | 'timid'
  | 'social'
  | 'homebody'
  | 'mischief'
  | 'clingy'
  | 'stubborn'
  | 'easygoing';

/** 만남 경로. 펫숍 구매는 기획상 존재하지 않는다. */
export type Route = 'shelter' | 'rural' | 'rescue' | 'acquaintance';

/** 판마다 무작위로 정해지는 이야기 흐름(플레이어에게는 결말에서 공개). */
export type Arc = 'cheerful' | 'laughThenTears' | 'calmTouching' | 'tearsThenLaugh';

export type Tone = 'cheerful' | 'calm' | 'touching';

export type Stage = 'puppy' | 'young' | 'adult' | 'senior' | 'elderly';

export type Stats = {
  health: number;
  happiness: number;
  bond: number;
  sociability: number;
};

export type StatKey = keyof Stats;

export type Meeting = {
  breedId: string;
  nickname: string | null;
  coatId: string;
  look: Look;
  sex: Sex;
  ageMonths: number;
  route: Route;
  traits: readonly [TraitId, TraitId];
  /** 만남 카드에 보여 줄 소개 문장들. */
  intro: readonly string[];
  /** 이름 짓기 추천 이름. */
  suggestedNames: readonly string[];
};

export type Dog = {
  id: string;
  name: string;
  breedId: string;
  nickname: string | null;
  coatId: string;
  look: Look;
  sex: Sex;
  traits: readonly [TraitId, TraitId];
  route: Route;
  ageMonths: number;
  metAgeMonths: number;
  /** 이 판에서 가족이 된 달(판 시작 = 0). */
  joinedMonth: number;
  lifespanMonths: number;
  stats: Stats;
  stage: Stage;
  passedMonth: number | null;
  /** 사건이 남긴 이 강아지의 표시(예: 'neutered', 'terminal-illness'). */
  flags: string[];
  /** 사건 id → 마지막으로 일어난 달. 한 번만·재등장 대기 판단에 쓴다. */
  seen: Record<string, number>;
};

export type LogKind = 'meet' | 'stage' | 'birthday' | 'event' | 'choice' | 'passed';

export type LogEntry = {
  month: number;
  dogId: string;
  kind: LogKind;
  text: string;
  /** 선택 사건이면 고른 선택지 문구. */
  choice?: string;
  eventId?: string;
  tone?: Tone;
  /** 결말 카드의 "기억에 남는 순간" 후보. */
  memorable?: boolean;
};

/** 플레이어의 선택을 기다리는 사건. 화면에 그대로 보여 줄 문장을 담는다. */
export type PendingChoice = {
  eventId: string;
  dogId: string;
  month: number;
  tone: Tone;
  text: string;
  choices: { id: string; label: string }[];
  /** 자동 결정이 켜져 있어도 반드시 플레이어에게 묻는 사건. */
  alwaysAsk: boolean;
};

/** 나중에 이어지는 사건(예: "1년 더 지켜보고 결정하기"). */
export type ScheduledEvent = {
  eventId: string;
  dogId: string;
  month: number;
};

export type Mood = 'great' | 'good' | 'okay' | 'low';

/** 견생 지도 한 칸(한 달). */
export type TimelineCell = {
  month: number;
  stage: Stage;
  mood: Mood;
};

export type RunStatus = 'running' | 'ended';

/** 한 판의 전체 상태. 그대로 JSON으로 저장하고 다시 불러올 수 있다. */
export type RunState = {
  version: 1;
  seed: number;
  rngState: number;
  month: number;
  arc: Arc;
  dogs: Dog[];
  household: { ease: number; flags: string[] };
  log: LogEntry[];
  timeline: TimelineCell[];
  status: RunStatus;
  pendingChoice: PendingChoice | null;
  scheduled: ScheduledEvent[];
  /** 마지막 선택 사건이 나온 달. 선택 카드가 너무 자주 뜨지 않게 한다. */
  lastChoiceMonth: number;
};
