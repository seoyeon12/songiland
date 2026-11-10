import type { FillingId } from '../types';

/**
 * 소 데이터. 앞 두 가지(팥·슈크림)로 장사를 시작하고, 후반에 고구마가 열린다(shift.fillingsAt).
 * 그림·이모지는 화면(2단계)에서 쓴다.
 */
export const FILLINGS: Record<FillingId, { label: string; emoji: string }> = {
  'red-bean': { label: '팥', emoji: '🫘' },
  custard: { label: '슈크림', emoji: '🍮' },
  'sweet-potato': { label: '고구마', emoji: '🍠' },
};

/** 소 등장 순서. 앞 두 개가 기본, 세 번째(고구마)는 장사 후반에 더해진다. */
export const FILLING_IDS = [
  'red-bean',
  'custard',
  'sweet-potato',
] as const satisfies readonly FillingId[];
