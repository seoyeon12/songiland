import type { Grade, ServedGrade } from './types';

/** 손님이 받아 준 붕어빵의 등급별 기본 점수. */
export const GRADE_POINTS: Record<ServedGrade, number> = {
  perfect: 100,
  good: 70,
  cold: 40,
};

/** 주문과 다른 소를 내밀면 매기는 벌점(손님이 거절, 붕어빵은 거치대에 남는다). */
export const MISMATCH_PENALTY = -30;

/** 탄 붕어빵을 내밀면 매기는 벌점(손님이 거절, 쓰레기통에 버려야 한다). */
export const BURNT_SERVE_PENALTY = -50;

export const MAX_COMBO_MULTIPLIER = 3;

/** Perfect를 이만큼 연달아 낼 때마다 배수가 1씩 오른다. */
const COMBO_STEP = 3;

/** Perfect 연속 수(streak)에 따른 점수 배수. 3연속부터 2배, 6연속부터 3배(상한). */
export function comboMultiplier(perfectStreak: number): number {
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(perfectStreak / COMBO_STEP));
}

/** 손님에게 붕어빵 하나를 내민 것. */
export type Serve = {
  grade: Grade;
  /** 주문한 소와 같은지. */
  matched: boolean;
};

/** 받아 줌 · 소가 달라 거절 · 탄 것이라 거절. 탄 것이 먼저다(소가 달라도 탄 벌점). */
export type ServeOutcome = 'accepted' | 'mismatch' | 'burnt';

export function serveOutcome(serve: Serve): ServeOutcome {
  if (serve.grade === 'burnt') {
    return 'burnt';
  }
  return serve.matched ? 'accepted' : 'mismatch';
}

export type Tally = {
  /** 점수(0 미만으로 내려가지 않는다). */
  score: number;
  /** 지금 이어지는 Perfect 콤보. */
  streak: number;
  /** 가장 길게 이어진 Perfect 콤보. */
  bestStreak: number;
  /** 손님이 받아 준 등급별 개수. */
  counts: Record<ServedGrade, number>;
  /** 손님이 받아 준 붕어빵 수. */
  served: number;
  /** 다른 소를 내밀어 거절당한 횟수. */
  mismatches: number;
  /** 탄 붕어빵을 내밀어 거절당한 횟수. */
  burntServes: number;
};

export function emptyTally(): Tally {
  return {
    score: 0,
    streak: 0,
    bestStreak: 0,
    counts: { perfect: 0, good: 0, cold: 0 },
    served: 0,
    mismatches: 0,
    burntServes: 0,
  };
}

/**
 * 한 번 내민 결과를 집계에 더한다. Perfect가 이어지면 콤보 배수가 오르고, Perfect가 아니거나
 * 거절당하면 콤보가 끊긴다.
 */
export function applyServe(tally: Tally, serve: Serve): Tally {
  const outcome = serveOutcome(serve);
  if (outcome === 'burnt') {
    return {
      ...tally,
      score: Math.max(0, tally.score + BURNT_SERVE_PENALTY),
      streak: 0,
      burntServes: tally.burntServes + 1,
    };
  }
  if (outcome === 'mismatch') {
    return {
      ...tally,
      score: Math.max(0, tally.score + MISMATCH_PENALTY),
      streak: 0,
      mismatches: tally.mismatches + 1,
    };
  }
  const grade = serve.grade as ServedGrade;
  const streak = grade === 'perfect' ? tally.streak + 1 : 0;
  const points = grade === 'perfect' ? GRADE_POINTS.perfect * comboMultiplier(streak) : GRADE_POINTS[grade];
  return {
    ...tally,
    score: tally.score + points,
    streak,
    bestStreak: Math.max(tally.bestStreak, streak),
    counts: { ...tally.counts, [grade]: tally.counts[grade] + 1 },
    served: tally.served + 1,
  };
}

/** 내민 붕어빵들을 차례로 채점한다. */
export function scoreServes(serves: readonly Serve[]): Tally {
  return serves.reduce(applyServe, emptyTally());
}
