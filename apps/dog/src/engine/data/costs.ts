import type { CoatType, RunState, Size } from '../types';
import { getBreed } from './breeds';

/**
 * 견생에 든 비용 집계. 결말에서만 공개한다(진행 중에는 여유 막대로만 느낀다).
 *
 * 금액은 모두 **만원** 단위이며, 국내 통계와 진료비 공시를 기준으로 한 어림값이다.
 * - 농식품부 2024 동물복지 국민의식조사: 반려견 월평균 양육비 약 17.5만원(그중 병원비 6.5만원).
 * - 농식품부 동물병원 진료비 공시(2024): 개 종합백신 1회 평균 약 2.6만원, 스케일링·중성화 등.
 * 같은 시드면 같은 견생이 나오므로 비용도 같다. 저장 상태를 바꾸지 않고 결말에서 계산한다.
 */

export type CostCategory = 'food' | 'medical' | 'grooming' | 'training' | 'supplies';

export const COST_CATEGORY_IDS: readonly CostCategory[] = [
  'food',
  'medical',
  'grooming',
  'training',
  'supplies',
];

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  food: '사료·간식',
  medical: '병원',
  grooming: '미용',
  training: '훈련·돌봄',
  supplies: '용품·기타',
};

/** 전국 평균(비교용). 출처는 결말 카드 아래에 적는다. */
export const NATIONAL = {
  /** 반려견 월평균 양육비(만원). 농식품부 2024 동물복지 국민의식조사. */
  monthly: 17.5,
  /** 그중 월평균 병원비(만원). */
  monthlyVet: 6.5,
  source: '농식품부 2024 동물복지 국민의식조사 · 동물병원 진료비 공시',
} as const;

/**
 * 체급별 한 달 기본 비용(만원). 사료·간식, 용품·기타, 병원(예방·구충·건강관리 등 기본).
 * 2,000판 보정(2026-11-07): 월평균 중간값을 전국 평균(17.5만원) 언저리에 두면서, 국내 세부
 * 수치(월 병원비 6.5만원 ≈ 37%)에 가깝도록 병원 기본비를 올리고 사료를 조금 낮췄다.
 */
const MONTHLY: Record<Size, { food: number; supplies: number; medical: number }> = {
  toy: { food: 4.5, supplies: 1.5, medical: 4 },
  small: { food: 5, supplies: 2, medical: 5 },
  medium: { food: 7.5, supplies: 2.5, medical: 6 },
  large: { food: 10.5, supplies: 3, medical: 7 },
};

/** 털 종류별 한 달 미용비(만원). 장모·곱슬·와이어는 미용실을 다니고 단모는 집에서 관리한다. */
const GROOMING_MONTHLY: Record<CoatType, number> = {
  long: 5,
  curly: 5,
  wire: 5,
  short: 0.5,
};

/**
 * 사건이 한 번 일어날 때 드는 어림 비용(만원). 선택 사건은 분기마다 금액이 다르지만,
 * 여러 번의 판에 걸친 기댓값에 가까운 대표값 하나로 단순화한다(어림값).
 */
const EVENT_COSTS: Partial<Record<string, { category: CostCategory; amount: number }>> = {
  // 성장: 예방접종(종합백신 5차·광견병·켄넬코프 등 1년차 묶음)
  vaccination: { category: 'medical', amount: 15 },
  'potty-training': { category: 'training', amount: 5 },
  // 건강: 질환별 진료·수술 기댓값
  patella: { category: 'medical', amount: 35 },
  dental: { category: 'medical', amount: 15 },
  skin: { category: 'medical', amount: 12 },
  disc: { category: 'medical', amount: 30 },
  diet: { category: 'medical', amount: 6 },
  eye: { category: 'medical', amount: 25 },
  heart: { category: 'medical', amount: 18 },
  checkup: { category: 'medical', amount: 8 },
  trachea: { category: 'medical', amount: 12 },
  stone: { category: 'medical', amount: 30 },
  'short-nose': { category: 'medical', amount: 8 },
  'terminal-illness': { category: 'medical', amount: 50 },
  // 일상 건강
  'upset-tummy': { category: 'medical', amount: 4 },
  'vet-visit': { category: 'medical', amount: 3 },
  // 가족: 유치원·돌봄
  'new-job': { category: 'training', amount: 8 },
  // 노년 돌봄 용품
  'sofa-climb': { category: 'supplies', amount: 5 },
  'night-wander': { category: 'supplies', amount: 3 },
  stroller: { category: 'supplies', amount: 15 },
  'sight-fading': { category: 'supplies', amount: 3 },
  // 문제행동: 훈련사·행동의학·유치원·펫시터
  'separation-care': { category: 'training', amount: 22 },
  'isolation-care': { category: 'training', amount: 20 },
  'aggression-care': { category: 'training', amount: 25 },
  'guarding-care': { category: 'training', amount: 20 },
  'prey-care': { category: 'training', amount: 18 },
  'walk-care': { category: 'training', amount: 15 },
};

/** 한 번만 드는 표시(flag) 기반 비용(만원). 중성화는 사건이 다시 물어도 비용은 한 번만 센다. */
const FLAG_COSTS: Partial<Record<string, { category: CostCategory; amount: number }>> = {
  neutered: { category: 'medical', amount: 35 },
};

/** 비용 테이블을 다른 모듈(테스트)에서 검증할 수 있게 노출한다. */
export const COST_TABLE = { MONTHLY, GROOMING_MONTHLY, EVENT_COSTS, FLAG_COSTS } as const;

export type CostBreakdown = {
  /** 총비용(만원). */
  total: number;
  byCategory: Record<CostCategory, number>;
  /** 한 마리당 월평균 비용(만원). 전국 평균과 비교한다. */
  monthlyAverage: number;
  /** 모든 아이가 함께한 개월 수의 합(월평균을 내는 분모). */
  dogMonths: number;
};

const round0 = (value: number) => Math.round(value);
const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * 한 판에 든 비용을 집계한다. 가족 모두(첫째·동생들)의 달마다 기본 비용과, 로그에 남은 사건
 * 비용을 더한다. 남은 아이들의 이야기(epilogue)에서 더 산 달과 사건도 포함한다.
 */
export function computeCost(state: RunState): CostBreakdown {
  const by: Record<CostCategory, number> = {
    food: 0,
    medical: 0,
    grooming: 0,
    training: 0,
    supplies: 0,
  };
  let dogMonths = 0;

  for (const base of state.dogs) {
    // epilogue까지 산 아이는 그때의 마지막 나이로 함께한 개월을 센다.
    const dog = state.epilogue?.dogs.find((entry) => entry.id === base.id) ?? base;
    const months = Math.max(0, dog.ageMonths - dog.metAgeMonths);
    dogMonths += months;

    const size = getBreed(dog.breedId).size;
    const monthly = MONTHLY[size];
    by.food += monthly.food * months;
    by.supplies += monthly.supplies * months;
    by.medical += monthly.medical * months;
    by.grooming += GROOMING_MONTHLY[dog.look.coatType] * months;

    for (const flag of dog.flags) {
      const cost = FLAG_COSTS[flag];
      if (cost) {
        by[cost.category] += cost.amount;
      }
    }
  }

  const log = [...state.log, ...(state.epilogue?.log ?? [])];
  for (const entry of log) {
    if (!entry.eventId) {
      continue;
    }
    const cost = EVENT_COSTS[entry.eventId];
    if (cost) {
      by[cost.category] += cost.amount;
    }
  }

  for (const key of COST_CATEGORY_IDS) {
    by[key] = round0(by[key]);
  }
  const total = COST_CATEGORY_IDS.reduce((sum, key) => sum + by[key], 0);
  return {
    total,
    byCategory: by,
    monthlyAverage: dogMonths > 0 ? round1(total / dogMonths) : 0,
    dogMonths,
  };
}

/** 만원 단위를 "2,460만원", "1억 240만원"처럼 읽기 쉽게 바꾼다. */
export function formatManwon(manwon: number): string {
  const rounded = Math.round(manwon);
  if (rounded < 10000) {
    return `${rounded.toLocaleString('ko-KR')}만원`;
  }
  const eok = Math.floor(rounded / 10000);
  const rest = rounded % 10000;
  return rest === 0 ? `${eok}억원` : `${eok}억 ${rest.toLocaleString('ko-KR')}만원`;
}
