import { behaviorsOf, type BehaviorId } from './data/behaviors';
import { breedEncounterPercent, getBreed } from './data/breeds';
import { TRAIT_IDS, traitsConflict } from './data/traits';
import { routeProbability, ROUTE_LABELS } from './meeting';
import type { Dog, RunState, TraitId } from './types';

/**
 * 결말 "견생 통계"에 쓰는 비교 수치. 게임 데이터로 계산한 "이 조합을 다시 만날 확률"과,
 * 실제 통계와 견주는 수명·문제행동이다. 출처는 결말 카드 아래에 적는다.
 */

/**
 * 성격 한 쌍이 나올 확률(0~1). 첫 성격은 8개 중 균등하게, 둘째 성격은 충돌하지 않는
 * 나머지 중 균등하게 뽑히므로(meeting.drawTraits) 두 순서를 더한다.
 */
export function traitPairProbability(a: TraitId, b: TraitId): number {
  if (a === b || traitsConflict(a, b)) {
    return 0;
  }
  const total = TRAIT_IDS.length;
  const restCount = (trait: TraitId) =>
    TRAIT_IDS.filter((other) => other !== trait && !traitsConflict(trait, other)).length;
  return (1 / total) * (1 / restCount(a)) + (1 / total) * (1 / restCount(b));
}

export type ComboPart = { label: string; percent: number };

export type ComboEncounter = {
  /** 견종 × 경로 × 성격 두 가지가 모두 겹칠 확률(0~1). */
  probability: number;
  /** "약 n명 중 1" 형태로 보여 줄 값. */
  oneIn: number;
  parts: ComboPart[];
};

/** 첫째와 똑같은 조합(견종·만난 곳·성격)을 다시 만날 확률. */
export function comboEncounter(run: RunState): ComboEncounter {
  const dog = run.dogs[0];
  const breed = getBreed(dog.breedId);
  const breedP = breedEncounterPercent(dog.breedId) / 100;
  const routeP = routeProbability(breed.family, dog.route);
  const [first, second] = dog.traits;
  const traitP = traitPairProbability(first, second);
  const probability = breedP * routeP * traitP;
  return {
    probability,
    oneIn: probability > 0 ? Math.max(1, Math.round(1 / probability)) : 0,
    parts: [
      { label: breed.name, percent: breedP * 100 },
      { label: ROUTE_LABELS[dog.route], percent: routeP * 100 },
      { label: '이 성격 조합', percent: traitP * 100 },
    ],
  };
}

export type LifespanCompare = {
  /** 함께한 끝의 나이(년, 소수 한 자리). */
  years: number;
  /** 견종 기대 수명 범위(년). 일반적인 경향을 단순화한 값. */
  breedLow: number;
  breedHigh: number;
  /** 'short' = 범위보다 짧게, 'typical' = 범위 안, 'long' = 범위보다 길게. */
  band: 'short' | 'typical' | 'long';
};

function lifespanCompare(dog: Dog): LifespanCompare {
  const breed = getBreed(dog.breedId);
  const [low, high] = breed.lifespanYears;
  const years = Math.round((dog.ageMonths / 12) * 10) / 10;
  const band = years < low ? 'short' : years > high ? 'long' : 'typical';
  return { years, breedLow: low, breedHigh: high, band };
}

/**
 * 문제행동 비율 비교값(%). 국내 조사가 없어 해외 대규모 연구를 쓴다. 원문 재확인 완료(2026-11-07).
 * 출처: Salonen et al. (2020), "Prevalence, comorbidity, and breed differences in canine anxiety
 * in 13,700 Finnish pet dogs", Scientific Reports 10:2962. https://doi.org/10.1038/s41598-020-59837-z
 * 원문 수치: 분리 관련 행동(separation related behaviour) 6%, 공격성(aggression) 전체 14%.
 * - 분리불안·고립불안은 원문의 한 범주("분리 관련 행동" 6%)에 함께 둔다.
 * - 소유공격성(resource guarding)·사냥 본능·산책중독은 이 연구에 대응 수치가 없어 비운다.
 *   (지어낸 값을 쓰지 않는다. 적절한 출처가 생기면 그때 채운다.)
 */
const BEHAVIOR_TYPICAL: Partial<Record<BehaviorId, number>> = {
  'separation-anxiety': 6,
  'isolation-distress': 6,
  aggression: 14,
};

export const BEHAVIOR_SOURCE =
  '문제행동 비율은 해외 대규모 조사(핀란드 반려견 약 1만 3,700마리, Salonen 외 2020) 수치예요.';

export type BehaviorCompare = {
  id: BehaviorId;
  label: string;
  eased: boolean;
  /** 또래 반려견 중 이 행동을 겪는 비율(%). 대응 수치가 없으면 null. */
  typicalPercent: number | null;
};

function behaviorCompare(dog: Dog): BehaviorCompare[] {
  return behaviorsOf(dog).map((behavior) => ({
    id: behavior.id,
    label: behavior.label,
    eased: behavior.eased,
    typicalPercent: BEHAVIOR_TYPICAL[behavior.id] ?? null,
  }));
}

export type LifeStats = {
  combo: ComboEncounter;
  lifespan: LifespanCompare;
  behaviors: BehaviorCompare[];
};

/** 결말 견생 통계. 첫째를 기준으로 계산한다. */
export function lifeStats(run: RunState): LifeStats {
  const dog = run.dogs[0];
  return {
    combo: comboEncounter(run),
    lifespan: lifespanCompare(dog),
    behaviors: behaviorCompare(dog),
  };
}
