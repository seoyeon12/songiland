import type { Mood, Size, Stage } from './types';

/**
 * 생애 단계가 바뀌는 나이(개월). 소형견은 늦게, 대형견은 일찍 노견이 된다.
 * 순서: 청년 시작, 어른 시작, 시니어 시작, 노견 시작.
 */
const STAGE_STARTS: Record<Size, readonly [number, number, number, number]> = {
  toy: [12, 36, 96, 132],
  small: [12, 36, 96, 132],
  medium: [12, 30, 84, 120],
  large: [12, 24, 72, 96],
};

const ORDER: readonly Stage[] = ['puppy', 'young', 'adult', 'senior', 'elderly'];

export const STAGE_LABELS: Record<Stage, string> = {
  puppy: '아기',
  young: '청년',
  adult: '어른',
  senior: '시니어',
  elderly: '노견',
};

export function stageFor(size: Size, ageMonths: number): Stage {
  const starts = STAGE_STARTS[size];
  let stage: Stage = 'puppy';
  starts.forEach((start, index) => {
    if (ageMonths >= start) {
      stage = ORDER[index + 1];
    }
  });
  return stage;
}

/** 해당 단계가 시작되는 나이(개월). */
export function stageStart(size: Size, stage: Stage): number {
  const index = ORDER.indexOf(stage);
  return index === 0 ? 0 : STAGE_STARTS[size][index - 1];
}

export function moodFor(happiness: number): Mood {
  if (happiness >= 75) {
    return 'great';
  }
  if (happiness >= 55) {
    return 'good';
  }
  if (happiness >= 35) {
    return 'okay';
  }
  return 'low';
}
