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
  it('maps physical keys to fillings', () => {
    const state = reduce(createSession(shift, STANDARD_SHOP), { type: 'tick', nowMs: 0 });
    expect(actionForKey('Digit2', state)).toEqual({ type: 'select', filling: 'custard' });
    expect(actionForKey('Numpad1', state)).toMatchObject({ filling: 'red-bean' });
    // 틀은 마우스로만 누른다(예전 틀 키 Q~R은 아무 일도 안 한다). 빈 거치대·관계없는 키도 무시한다.
    expect(actionForKey('KeyQ', state)).toBeNull();
    expect(actionForKey('KeyR', reduce(state, { type: 'pour', panIndex: 3 }))).toBeNull();
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
