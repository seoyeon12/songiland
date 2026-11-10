import type { Doneness, Grade } from '../engine';

/** 붕어빵 색: 덜 익음 = 연한 반죽색, 잘 구움 = 황금색, 식음 = 칙칙한 갈색, 탐 = 진갈색. */
export function gradeColor(state: Doneness | Grade): string {
  switch (state) {
    case 'raw':
      return '#efe0b8';
    case 'cold':
      return '#c4a27a';
    case 'burnt':
      return '#6b4226';
    default:
      return '#d9a24f';
  }
}

export const GRADE_LABEL: Record<Grade, string> = {
  perfect: '완벽',
  good: '좋음',
  cold: '식음',
  burnt: '탐',
};
