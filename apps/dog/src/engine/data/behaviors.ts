import type { Dog } from '../types';

/** 문제행동. 사건이 강아지 표시(flag)로 남기고, 좋아지면 `<id>-eased` 표시가 붙는다. */
export type BehaviorId =
  | 'separation-anxiety'
  | 'isolation-distress'
  | 'aggression'
  | 'resource-guarding'
  | 'prey-drive'
  | 'walk-obsession';

export const BEHAVIORS: Record<BehaviorId, { label: string }> = {
  'separation-anxiety': { label: '분리불안' },
  'isolation-distress': { label: '고립불안' },
  aggression: { label: '공격성' },
  'resource-guarding': { label: '소유공격성' },
  'prey-drive': { label: '사냥 본능' },
  'walk-obsession': { label: '산책중독' },
};

export const BEHAVIOR_IDS = Object.keys(BEHAVIORS) as BehaviorId[];

export function easedFlag(id: BehaviorId): string {
  return `${id}-eased`;
}

/** 되풀이 사건을 한 번 이상 겪었다는 표시. "어떻게 도와줄까요?" 선택 카드는 그 뒤에 나온다. */
export function repeatFlag(id: BehaviorId): string {
  return `${id}-again`;
}

export type BehaviorState = { id: BehaviorId; label: string; eased: boolean };

/** 이 아이가 겪은 문제행동과 좋아졌는지 여부. */
export function behaviorsOf(dog: Dog): BehaviorState[] {
  return BEHAVIOR_IDS.filter((id) => dog.flags.includes(id)).map((id) => ({
    id,
    label: BEHAVIORS[id].label,
    eased: dog.flags.includes(easedFlag(id)),
  }));
}
