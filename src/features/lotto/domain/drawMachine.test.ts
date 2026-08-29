import { initialDrawState, drawReducer } from './drawMachine';
import type { DrawPlan } from './types';

const plan: DrawPlan = {
  main: [4, 8, 15, 16, 23, 42],
  bonus: 7,
  revealOrder: [4, 8, 15, 16, 23, 42, 7],
  sortedMain: [4, 8, 15, 16, 23, 42],
};

it('permits exactly one completed reveal at a time and completes after the bonus', () => {
  let state = drawReducer(initialDrawState, { type: 'START', plan });
  expect(state.phase).toBe('mixing');
  state = drawReducer(state, { type: 'MIXING_FINISHED' });
  state = drawReducer(state, { type: 'REQUEST_REVEAL' });
  expect(state.phase).toBe('revealing');
  expect(drawReducer(state, { type: 'REQUEST_REVEAL' })).toEqual(state);
  state = drawReducer(state, { type: 'REVEAL_FINISHED' });
  expect(state.revealedCount).toBe(1);
});

it('ignores events that are invalid for the current phase', () => {
  expect(drawReducer(initialDrawState, { type: 'REQUEST_REVEAL' })).toEqual(
    initialDrawState,
  );
  expect(drawReducer(initialDrawState, { type: 'REVEAL_FINISHED' })).toEqual(
    initialDrawState,
  );
});

it('returns to ready between reveals and reaches complete after seven balls', () => {
  let state = drawReducer(initialDrawState, { type: 'START', plan });
  state = drawReducer(state, { type: 'MIXING_FINISHED' });
  expect(state.phase).toBe('ready');
  for (let index = 0; index < 7; index += 1) {
    state = drawReducer(state, { type: 'REQUEST_REVEAL' });
    expect(state.phase).toBe('revealing');
    state = drawReducer(state, { type: 'REVEAL_FINISHED' });
    expect(state.revealedCount).toBe(index + 1);
    expect(state.phase).toBe(index === 6 ? 'complete' : 'ready');
  }
  // Once complete, further reveal requests are ignored.
  expect(drawReducer(state, { type: 'REQUEST_REVEAL' })).toEqual(state);
});
