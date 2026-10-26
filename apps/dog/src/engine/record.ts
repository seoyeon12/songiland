import { getBreed, getCoat } from './data/breeds';
import { traitLabel } from './data/traits';
import { arcTitle } from './simulation';
import { ROUTE_LABELS } from './meeting';
import type { Dog, LogEntry, RunState, TimelineCell } from './types';

export type Moment = { month: number; text: string };

/** 한 아이의 견생 요약. */
export type DogSummary = {
  id: string;
  name: string;
  breedName: string;
  nickname: string | null;
  coatLabel: string;
  traits: string[];
  route: string;
  metAgeMonths: number;
  ageAtEndMonths: number;
  monthsTogether: number;
};

/** 첫째와 함께한 다른 아이(둘째·셋째)의 기록 카드. */
export type FamilyRecord = {
  /** 마지막 모습(일러스트용) */
  dog: Dog;
  summary: DogSummary;
  highlights: Moment[];
  /** 첫째보다 먼저(또는 같은 달에) 떠났으면 true, 첫째를 보낸 뒤에도 함께했으면 false */
  leftFirst: boolean;
  /** 첫째를 보낸 뒤 더 함께한 개월 수 */
  monthsAfter: number;
  /** 마지막 인사 문장 */
  farewell: string | null;
};

/** 결말 카드(견생 기록)에 필요한 요약. */
export type RunRecord = {
  seed: number;
  arcTitle: string;
  dog: DogSummary;
  /** 함께한 다른 아이들. 남은 아이들은 첫째를 보낸 뒤의 이야기까지 담는다. */
  family: FamilyRecord[];
  timeline: TimelineCell[];
  /** 가장 기억에 남는 순간(최대 3개). */
  highlights: Moment[];
  /** 플레이어가 고른 선택 수(남은 아이들의 이야기는 자동이라 세지 않는다). */
  choicesMade: number;
  ended: boolean;
};

/** 고르게 퍼진 순간을 고른다: 처음·가운데·끝. */
function spread<T>(items: readonly T[], count: number): T[] {
  if (items.length <= count) {
    return [...items];
  }
  const picked: T[] = [];
  for (let i = 0; i < count; i += 1) {
    picked.push(items[Math.round((i * (items.length - 1)) / (count - 1))]);
  }
  return picked;
}

/**
 * 기억에 남는 순간 3개. 짝으로 함께한 순간도 넣는다. 표시된 순간이 모자라면 선택의 순간으로
 * 채운다. 이별 문장은 뺀다.
 */
export function pickHighlights(log: readonly LogEntry[], dogId: string): LogEntry[] {
  const mine = log.filter(
    (entry) => (entry.dogId === dogId || entry.partnerId === dogId) && entry.kind !== 'passed',
  );
  const memorable = mine.filter((entry) => entry.memorable);
  if (memorable.length >= 3) {
    return spread(memorable, 3);
  }
  const extra = spread(
    mine.filter((entry) => entry.kind === 'choice' && !entry.memorable),
    3 - memorable.length,
  );
  return [...memorable, ...extra].sort((a, b) => a.month - b.month);
}

function summarizeDog(dog: Dog): DogSummary {
  const breed = getBreed(dog.breedId);
  return {
    id: dog.id,
    name: dog.name,
    breedName: breed.name,
    nickname: dog.nickname,
    coatLabel: getCoat(breed, dog.coatId).label,
    traits: dog.traits.map((trait) => traitLabel(trait, dog.sex)),
    route: ROUTE_LABELS[dog.route],
    metAgeMonths: dog.metAgeMonths,
    ageAtEndMonths: dog.ageMonths,
    monthsTogether: dog.ageMonths - dog.metAgeMonths,
  };
}

const toMoment = ({ month, text }: LogEntry): Moment => ({ month, text });

/** 둘째·셋째의 기록 카드. 남은 아이는 첫째를 보낸 뒤의 이야기(epilogue)까지 본다. */
function summarizeFamily(state: RunState): FamilyRecord[] {
  const log = [...state.log, ...(state.epilogue?.log ?? [])];
  return state.dogs.slice(1).map((member) => {
    const dog = state.epilogue?.dogs.find((entry) => entry.id === member.id) ?? member;
    const leftFirst = member.passedMonth !== null;
    const lastMonth = dog.passedMonth ?? state.month;
    // 떠난 뒤 남은 아이들이 그리워한 순간은 그 아이 카드에 넣지 않는다.
    const lived = log.filter((entry) => entry.month <= lastMonth);
    const farewell = log.find((entry) => entry.dogId === dog.id && entry.kind === 'passed');
    return {
      dog,
      summary: summarizeDog(dog),
      highlights: pickHighlights(lived, dog.id).map(toMoment),
      leftFirst,
      monthsAfter: leftFirst ? 0 : lastMonth - state.month,
      farewell: farewell?.text ?? null,
    };
  });
}

export function summarize(state: RunState): RunRecord {
  const dog = state.dogs[0];
  return {
    seed: state.seed,
    arcTitle: arcTitle(state.arc),
    dog: summarizeDog(dog),
    family: summarizeFamily(state),
    timeline: state.timeline,
    highlights: pickHighlights(state.log, dog.id).map(toMoment),
    choicesMade: state.log.filter((entry) => entry.choice).length,
    ended: state.status === 'ended',
  };
}

/** 강아지 나이를 "4개월", "3살"처럼 바꾼다. */
export function formatAge(months: number): string {
  return months < 12 ? `${months}개월` : `${Math.floor(months / 12)}살`;
}

/** 개월 수를 "3년 2개월"처럼 읽기 쉽게 바꾼다. */
export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) {
    return `${rest}개월`;
  }
  return rest === 0 ? `${years}년` : `${years}년 ${rest}개월`;
}
