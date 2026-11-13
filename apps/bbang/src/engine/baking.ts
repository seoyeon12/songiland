import { clamp01, lerp } from './num';
import type { CookWindow, Doneness, Grade } from './types';

/**
 * 난이도별 익힘 구간. difficulty 0=장사 초반, 1=막판. 막판일수록 빨리 익고 초록 구간이 좁아진다.
 * widthBonus는 초록 폭 추가 비율(비싼 반죽, 0.1 = +10%).
 * Perfect는 초록 한가운데 40%이고, 양 끝 30%씩이 Good이다(5단계 밸런스: 절반이면 콤보가 안 끊겼다).
 */
/** 초록 구간 양 끝에서 Good으로 남기는 비율. */
const PERFECT_PAD = 0.3;

export function cookWindow(difficulty: number, widthBonus = 0): CookWindow {
  const d = clamp01(difficulty);
  const greenStartMs = lerp(1800, 1200, d); // 짧게 기다리면 익는다
  // 폭: 초반 2.4초 → 막판 1.2초. 비싼 반죽(widthBonus)이면 그만큼 넓다(내 가게 모드).
  const greenWidth = lerp(2400, 1200, d) * (1 + Math.max(0, widthBonus));
  const greenEndMs = greenStartMs + greenWidth;
  const pad = greenWidth * PERFECT_PAD;
  return {
    greenStartMs,
    greenEndMs,
    perfectStartMs: greenStartMs + pad,
    perfectEndMs: greenEndMs - pad,
  };
}

/**
 * 반죽 부은 때로부터 onPanMs가 지났을 때의 익힘 상태.
 * 초록 전 = 아직 덜 익음(꺼낼 수 없음), 초록 한가운데 = Perfect, 초록 가장자리 = Good, 지나면 = 탐.
 */
export function judge(window: CookWindow, onPanMs: number): Doneness {
  if (onPanMs < window.greenStartMs) {
    return 'raw';
  }
  if (onPanMs > window.greenEndMs) {
    return 'burnt';
  }
  if (onPanMs >= window.perfectStartMs && onPanMs <= window.perfectEndMs) {
    return 'perfect';
  }
  return 'good';
}

/** 표준 가게에서 거치대에 이만큼 지날 때마다 한 단계씩 식는다(완벽 → 좋음 → 식음). */
export const COOL_STEP_MS = 8000;

const COOLING: readonly Grade[] = ['perfect', 'good', 'cold'];

/** 거치대에 heldMs만큼 둔 붕어빵의 등급. 탄 것은 식어도 탄 것이다. */
export function cooledGrade(grade: Grade, heldMs: number, stepMs = COOL_STEP_MS): Grade {
  if (grade === 'burnt') {
    return grade;
  }
  const steps = Math.max(0, Math.floor(heldMs / stepMs));
  return COOLING[Math.min(COOLING.length - 1, COOLING.indexOf(grade) + steps)];
}
