import { getBreed, getCoat } from './data/breeds';
import { traitLabel } from './data/traits';
import { arcTitle } from './simulation';
import { ROUTE_LABELS } from './meeting';
import type { RunState, TimelineCell } from './types';

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
  ended: boolean;
};

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
