import { describe, expect, it } from 'vitest';
import { STANDARD_SHOP } from '../engine';
import { createSession, reduce, type Action, type SessionState } from './session';
import { TUTORIAL_SHIFT, TUTORIAL_STEPS, tutorialStep } from './tutorial';

function run(state: SessionState, ...actions: Action[]): SessionState {
  return actions.reduce(reduce, state);
}

const at = (nowMs: number): Action => ({ type: 'tick', nowMs });

describe('tutorial', () => {
  it('walks through every step and ends when both customers are served', () => {
    let state = run(createSession(TUTORIAL_SHIFT, STANDARD_SHOP, { practice: true }), at(0));
    expect(tutorialStep(state)).toBe(0);

    state = reduce(state, { type: 'pour', panIndex: 0 });
    expect(tutorialStep(state)).toBe(1);
    state = run(state, at(3000), { type: 'take-out', panIndex: 0 }); // 팥 손님에게 바로
    expect(tutorialStep(state)).toBe(2);

    state = run(state, { type: 'select', filling: 'custard' }, { type: 'pour', panIndex: 1 });
    expect(tutorialStep(state)).toBe(3);
    state = run(state, at(6000), { type: 'take-out', panIndex: 1 });
    expect(tutorialStep(state)).toBe(TUTORIAL_STEPS.length);
    expect(state.over).toBe(true);
  });

  it('goes back a step when the batter burns', () => {
    const state = run(
      createSession(TUTORIAL_SHIFT, STANDARD_SHOP, { practice: true }),
      at(0),
      { type: 'pour', panIndex: 0 },
      at(10_000),
      { type: 'take-out', panIndex: 0 },
    );
    expect(tutorialStep(state)).toBe(0);
  });
});
