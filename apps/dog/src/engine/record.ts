import { getBreed, getCoat } from './data/breeds';
import { traitLabel } from './data/traits';
import { arcTitle } from './simulation';
import { ROUTE_LABELS } from './meeting';
import type { LogEntry, RunState, TimelineCell } from './types';

/** 결말 카드(견생 기록)에 필요한 요약. */
export type RunRecord = {
  seed: number;
  arcTitle: string;
  dog: {
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
  timeline: TimelineCell[];
  /** 가장 기억에 남는 순간(최대 3개). */
  highlights: { month: number; text: string }[];
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

/** 기억에 남는 순간 3개. 표시된 순간이 모자라면 선택의 순간으로 채운다. 이별 문장은 뺀다. */
export function pickHighlights(log: readonly LogEntry[], dogId: string): LogEntry[] {
  const mine = log.filter((entry) => entry.dogId === dogId && entry.kind !== 'passed');
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

export function summarize(state: RunState): RunRecord {
  const dog = state.dogs[0];
  const breed = getBreed(dog.breedId);
  return {
    seed: state.seed,
    arcTitle: arcTitle(state.arc),
    dog: {
      name: dog.name,
      breedName: breed.name,
      nickname: dog.nickname,
      coatLabel: getCoat(breed, dog.coatId).label,
      traits: dog.traits.map((trait) => traitLabel(trait, dog.sex)),
      route: ROUTE_LABELS[dog.route],
      metAgeMonths: dog.metAgeMonths,
      ageAtEndMonths: dog.ageMonths,
      monthsTogether: dog.ageMonths - dog.metAgeMonths,
    },
    timeline: state.timeline,
    highlights: pickHighlights(state.log, dog.id).map(({ month, text }) => ({ month, text })),
    choicesMade: state.log.filter((entry) => entry.dogId === dog.id && entry.choice).length,
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
