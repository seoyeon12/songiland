import { describe, expect, it } from 'vitest';
import { STANDARD_SHOP } from '../engine';
import { actionForKey } from './hotkeys';
import { createSession, reduce } from './session';

const shift = {
  seed: 0,
  durationMs: 90_000,
  orders: [{ id: 5, atMs: 60_000, filling: 'custard' as const, count: 1 }],
};

describe('hotkeys', () => {
  it('maps physical keys to fillings and pans', () => {
    const state = reduce(createSession(shift, STANDARD_SHOP), { type: 'tick', nowMs: 0 });
    expect(actionForKey('Digit2', state)).toEqual({ type: 'select', filling: 'custard' });
    expect(actionForKey('Numpad1', state)).toMatchObject({ filling: 'red-bean' });
    expect(actionForKey('KeyQ', state)).toEqual({ type: 'pour', panIndex: 0 });
    expect(actionForKey('KeyQ', reduce(state, { type: 'pour', panIndex: 0 }))).toEqual({
      type: 'take-out',
      panIndex: 0,
    });
    // 없는 칸(틀 5번째, 빈 거치대)과 관계없는 키는 무시한다.
    expect(actionForKey('KeyT', state)).toBeNull();
    expect(actionForKey('KeyZ', state)).toBeNull();
    expect(actionForKey('KeyA', state)).toBeNull();
    expect(actionForKey('Space', state)).toBeNull();
  });

  it('throws away the oldest rack item with Z', () => {
    let state = reduce(createSession(shift, STANDARD_SHOP), { type: 'tick', nowMs: 0 });
    state = reduce(state, { type: 'pour', panIndex: 0 });
    state = reduce(state, { type: 'pour', panIndex: 1 });
    state = reduce(state, { type: 'tick', nowMs: 3000 });
    state = reduce(state, { type: 'take-out', panIndex: 0 });
    state = reduce(state, { type: 'take-out', panIndex: 1 });
    expect(state.rack.map((item) => item.id)).toEqual([0, 1]);
    expect(actionForKey('KeyZ', state)).toEqual({ type: 'discard', itemId: 0 });
  });
});
