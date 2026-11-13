import { describe, expect, it } from 'vitest';
import { STANDARD_SHOP } from '../engine';
import { actionForKey } from './hotkeys';
import { createSession, reduce, type SessionState } from './session';

const shift = {
  seed: 0,
  durationMs: 90_000,
  orders: [{ id: 5, atMs: 0, filling: 'custard' as const, count: 1 }],
};

function withRack(): SessionState {
  let state = reduce(createSession(shift, STANDARD_SHOP), { type: 'tick', nowMs: 0 });
  state = reduce(state, { type: 'pour', panIndex: 0 });
  state = reduce(state, { type: 'tick', nowMs: 3000 });
  return reduce(state, { type: 'take-out', panIndex: 0 });
}

describe('hotkeys', () => {
  it('maps physical keys to fillings, pans and orders', () => {
    const state = reduce(createSession(shift, STANDARD_SHOP), { type: 'tick', nowMs: 0 });
    expect(actionForKey('Digit2', state, null)).toEqual({
      type: 'input',
      input: { type: 'select', filling: 'custard' },
    });
    expect(actionForKey('Numpad1', state, null)).toMatchObject({ input: { filling: 'red-bean' } });
    expect(actionForKey('KeyQ', state, null)).toMatchObject({ input: { type: 'pour', panIndex: 0 } });
    expect(actionForKey('KeyA', state, null)).toMatchObject({ input: { type: 'serve', orderId: 5 } });
    // 없는 칸(손님 2번째, 틀 5번째, 빈 거치대)과 관계없는 키는 무시한다.
    expect(actionForKey('KeyS', state, null)).toBeNull();
    expect(actionForKey('KeyT', state, null)).toBeNull();
    expect(actionForKey('KeyZ', state, null)).toBeNull();
    expect(actionForKey('Space', state, null)).toBeNull();
    expect(actionForKey('Backspace', state, null)).toBeNull();
  });

  it('picks a rack item, then gives it to an order or throws it away', () => {
    const state = withRack();
    expect(actionForKey('KeyQ', reduce(state, { type: 'pour', panIndex: 0 }), null)).toMatchObject({
      input: { type: 'take-out' },
    });
    expect(actionForKey('KeyZ', state, null)).toEqual({ type: 'select', itemId: 0 });
    expect(actionForKey('KeyZ', state, 0)).toEqual({ type: 'select', itemId: null });
    expect(actionForKey('KeyA', state, 0)).toMatchObject({
      input: { type: 'give', itemId: 0, orderId: 5 },
    });
    expect(actionForKey('Delete', state, 0)).toMatchObject({ input: { type: 'discard', itemId: 0 } });
  });

  it('moves the pick along the rack with the arrow keys, wrapping at the ends', () => {
    let state = withRack();
    state = reduce(state, { type: 'pour', panIndex: 1 });
    state = reduce(state, { type: 'pour', panIndex: 2 });
    state = reduce(state, { type: 'tick', nowMs: 6000 });
    state = reduce(state, { type: 'take-out', panIndex: 1 });
    state = reduce(state, { type: 'take-out', panIndex: 2 });
    expect(state.rack.map((item) => item.id)).toEqual([0, 1, 2]);

    expect(actionForKey('ArrowRight', state, null)).toEqual({ type: 'select', itemId: 0 });
    expect(actionForKey('ArrowLeft', state, null)).toEqual({ type: 'select', itemId: 2 });
    expect(actionForKey('ArrowRight', state, 0)).toEqual({ type: 'select', itemId: 1 });
    expect(actionForKey('ArrowRight', state, 2)).toEqual({ type: 'select', itemId: 0 });
    expect(actionForKey('ArrowLeft', state, 0)).toEqual({ type: 'select', itemId: 2 });
    expect(actionForKey('ArrowLeft', { ...state, rack: [] }, null)).toBeNull(); // 빈 거치대
  });
});
