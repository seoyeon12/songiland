import type { DrawEvent, DrawState } from './types';

const TOTAL_REVEALS = 7;

export const initialDrawState: DrawState = {
  phase: 'idle',
  plan: null,
  revealedCount: 0,
};

/**
 * Reveal-lock state machine. It decides transitions only; it never generates
 * numbers, reads storage, or drives animation timing. Events that are invalid
 * for the current phase are ignored so no input can skip or double a ball.
 */
export function drawReducer(state: DrawState, event: DrawEvent): DrawState {
  switch (event.type) {
    case 'START':
      // A fresh draw plan resets progress and enters the mixing show.
      return { phase: 'mixing', plan: event.plan, revealedCount: 0 };

    case 'MIXING_FINISHED':
      return state.phase === 'mixing' ? { ...state, phase: 'ready' } : state;

    case 'REQUEST_REVEAL':
      return state.phase === 'ready' ? { ...state, phase: 'revealing' } : state;

    case 'REVEAL_FINISHED': {
      if (state.phase !== 'revealing') {
        return state;
      }
      const revealedCount = state.revealedCount + 1;
      const phase = revealedCount >= TOTAL_REVEALS ? 'complete' : 'ready';
      return { ...state, phase, revealedCount };
    }

    default:
      return state;
  }
}
