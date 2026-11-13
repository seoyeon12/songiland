import { describe, expect, it } from 'vitest';
import { createRng, createShift } from '../engine';
import { replay, scoreAt, scoreTimeline } from './replay';
import { createSession, panDoneness, reduce, type SessionState } from './session';

/** 들쭉날쭉한 프레임 간격으로 대충 플레이하는 봇. 실제 플레이처럼 tick 사이사이에 입력한다. */
function botPlay(seed: number): SessionState {
  const shift = createShift(seed);
  const rng = createRng(seed ^ 0xabc);
  let state = createSession(shift);
  let now = 0;
  while (!state.over) {
    now += rng.intRange(8, 40);
    state = reduce(state, { type: 'tick', nowMs: now });
    if (!rng.chance(0.15)) {
      continue;
    }
    const pans = state.pans;
    const emptyPan = pans.findIndex((pan) => pan.status === 'empty');
    const readyPan = pans.findIndex(
      (pan) => pan.status === 'cooking' && panDoneness(pan, state.elapsedMs, state.shop) !== 'raw',
    );
    const order = state.orders[0];
    if (order && order.filling !== state.selected) {
      state = reduce(state, { type: 'select', filling: order.filling });
    } else if (state.rack.length > 0 && order && rng.chance(0.7)) {
      state = reduce(state, { type: 'serve', orderId: order.id });
    } else if (state.rack.length > 0 && rng.chance(0.2)) {
      state = reduce(state, { type: 'discard', itemId: state.rack[0].id });
    } else if (readyPan >= 0) {
      state = reduce(state, { type: 'take-out', panIndex: readyPan });
    } else if (emptyPan >= 0) {
      state = reduce(state, { type: 'pour', panIndex: emptyPan });
    }
  }
  return state;
}

describe('replay', () => {
  it('reproduces a played shift exactly from its input log', () => {
    for (const seed of [1, 2, 3, 20261108]) {
      const played = botPlay(seed);
      expect(played.inputs.length).toBeGreaterThan(10);
      const again = replay(played.shift, played.inputs);
      expect(again.tally).toEqual(played.tally);
      expect(again.burnt).toBe(played.burnt);
      expect(again.discarded).toBe(played.discarded);
      expect(again.missedOrders).toBe(played.missedOrders);
      expect(again.revenue).toBe(played.revenue);
      expect(again.cost).toBe(played.cost);
    }
  });

  it('turns the input log into a score timeline that ends at the final score', () => {
    const played = botPlay(5);
    const timeline = scoreTimeline(played.shift, played.inputs);
    expect(timeline[0]).toEqual({ atMs: 0, score: 0 });
    expect(scoreAt(timeline, played.shift.durationMs)).toBe(played.tally.score);
    expect(scoreAt(timeline, 0)).toBe(0);
    for (let i = 1; i < timeline.length; i += 1) {
      expect(timeline[i].atMs).toBeGreaterThanOrEqual(timeline[i - 1].atMs);
    }
  });
});
