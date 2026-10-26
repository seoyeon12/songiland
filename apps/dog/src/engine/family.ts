import type { Dog, Pair, RunState } from './types';

/** 한 판에 함께하는 강아지는 최대 세 마리다. */
export const MAX_DOGS = 3;

export function isAlive(dog: Dog): boolean {
  return dog.passedMonth === null;
}

export function livingDogs(state: Pick<RunState, 'dogs'>): Dog[] {
  return state.dogs.filter(isAlive);
}

export function findPair(state: Pick<RunState, 'pairs'>, a: string, b: string): Pair | undefined {
  return state.pairs.find(
    ({ dogIds: [x, y] }) => (x === a && y === b) || (x === b && y === a),
  );
}

/** 두 아이 사이(0~100). 함께 산 적이 없으면 undefined. */
export function rapportBetween(
  state: Pick<RunState, 'pairs'>,
  a: string,
  b: string,
): number | undefined {
  return findPair(state, a, b)?.rapport;
}

/** 지금 함께 사는 아이들 중 이 아이와 가장 가까운 사이. 혼자 지내면 null. */
export function closestRapport(state: Pick<RunState, 'dogs' | 'pairs'>, dog: Dog): number | null {
  let best: number | null = null;
  for (const other of livingDogs(state)) {
    if (other.id === dog.id) {
      continue;
    }
    const rapport = rapportBetween(state, dog.id, other.id);
    if (rapport !== undefined && (best === null || rapport > best)) {
      best = rapport;
    }
  }
  return best;
}
