import { STANDARD_SHOP, type Shift, type ShopConfig } from '../engine';
import { createSession, reduce, type LoggedInput, type SessionState } from './session';

/** 고스트의 점수 흐름 한 점: 이 시각부터 이 점수. */
export type ScorePoint = { atMs: number; score: number };

/**
 * 입력 로그를 같은 장사에 다시 넣어 판을 재현한다. 리듀서가 순수하고 tick이 경과 시간만 보고
 * 움직이므로, 실제 플레이와 같은 결과가 나온다.
 */
export function replay(
  shift: Shift,
  inputs: readonly LoggedInput[],
  shop: ShopConfig = STANDARD_SHOP,
): SessionState {
  let state = createSession(shift, shop);
  for (const { atMs, input } of inputs) {
    state = reduce(reduce(state, { type: 'tick', nowMs: atMs }), input);
  }
  return reduce(state, { type: 'tick', nowMs: shift.durationMs });
}

/** 입력 로그를 돌리며 점수가 바뀐 시각들을 뽑는다(고스트 점수 막대용, 표준 가게). */
export function scoreTimeline(shift: Shift, inputs: readonly LoggedInput[]): ScorePoint[] {
  const points: ScorePoint[] = [{ atMs: 0, score: 0 }];
  let state = createSession(shift);
  for (const { atMs, input } of inputs) {
    state = reduce(reduce(state, { type: 'tick', nowMs: atMs }), input);
    if (state.tally.score !== points[points.length - 1].score) {
      points.push({ atMs, score: state.tally.score });
    }
  }
  return points;
}

/** 시각 atMs에 고스트가 가진 점수. */
export function scoreAt(timeline: readonly ScorePoint[], atMs: number): number {
  let score = 0;
  for (const point of timeline) {
    if (point.atMs > atMs) {
      break;
    }
    score = point.score;
  }
  return score;
}
