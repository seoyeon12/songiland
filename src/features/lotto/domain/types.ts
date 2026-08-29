export type RandomInt = (upperExclusive: number) => number;

export type DrawPlan = {
  main: [number, number, number, number, number, number];
  bonus: number;
  revealOrder: [number, number, number, number, number, number, number];
  sortedMain: [number, number, number, number, number, number];
};

export type DrawPhase = 'idle' | 'mixing' | 'ready' | 'revealing' | 'complete';

export type DrawState = {
  phase: DrawPhase;
  plan: DrawPlan | null;
  revealedCount: number;
};

export type DrawEvent =
  | { type: 'START'; plan: DrawPlan }
  | { type: 'MIXING_FINISHED' }
  | { type: 'REQUEST_REVEAL' }
  | { type: 'REVEAL_FINISHED' };
