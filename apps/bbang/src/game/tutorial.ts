import type { Shift } from '../engine';
import type { SessionState } from './session';

/**
 * 튜토리얼 판. 팥 손님 하나, 슈크림 손님 하나. 연습 판(practice)으로 돌려서
 * 손님이 떠나지 않고 목숨도 줄지 않으며, 둘 다 받으면 끝난다.
 */
export const TUTORIAL_SHIFT: Shift = {
  seed: 0,
  durationMs: 600_000,
  orders: [
    { id: 0, atMs: 0, filling: 'red-bean', count: 1 },
    { id: 1, atMs: 0, filling: 'custard', count: 1 },
  ],
};

export type TutorialStep = { title: string; done: (state: SessionState) => boolean };

const cooking = (state: SessionState, filling?: string) =>
  state.pans.some((pan) => pan.status === 'cooking' && (!filling || pan.filling === filling));

/** 튜토리얼 단계. 앞 단계부터 차례로, 처음으로 끝나지 않은 단계가 지금 할 일이다. */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: '빈 틀을 눌러 팥 반죽을 부어요',
    done: (state) => cooking(state, 'red-bean') || state.rack.length > 0 || state.tally.served > 0,
  },
  {
    title: '게이지 표시가 초록 구간에 들어오면 틀을 눌러 꺼내요 · 팥 손님에게 바로 가요',
    done: (state) => state.tally.served > 0,
  },
  {
    title: '아래에서 🍮 슈크림을 고르고 빈 틀을 눌러요',
    done: (state) =>
      cooking(state, 'custard') || state.rack.some((item) => item.filling === 'custard') || state.tally.served > 1,
  },
  {
    title: '다 익으면 꺼내요 · 슈크림 손님에게 가면 끝!',
    done: (state) => state.tally.served > 1,
  },
];

/** 지금 단계 번호(0부터). 다 끝났으면 TUTORIAL_STEPS.length. */
export function tutorialStep(state: SessionState): number {
  const index = TUTORIAL_STEPS.findIndex((step) => !step.done(state));
  return index === -1 ? TUTORIAL_STEPS.length : index;
}
