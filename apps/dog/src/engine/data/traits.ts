import type { Sex, Stats, TraitId } from '../types';

type Trait = {
  label: string;
  /** 성별에 따라 이름이 다른 성격(집순이·집돌이). */
  femaleLabel?: string;
  /** 시작 능력치에 더하는 값. */
  start: Partial<Stats>;
};

export const TRAITS: Record<TraitId, Trait> = {
  foodie: { label: '먹보', start: { happiness: 5 } },
  timid: { label: '겁쟁이', start: { sociability: -12 } },
  social: { label: '인싸', start: { sociability: 15 } },
  homebody: { label: '집돌이', femaleLabel: '집순이', start: { happiness: 3, sociability: -5 } },
  mischief: { label: '장난꾸러기', start: { happiness: 5, bond: -3 } },
  clingy: { label: '껌딱지', start: { bond: 10 } },
  stubborn: { label: '고집쟁이', start: { bond: -5 } },
  easygoing: { label: '느긋함', start: { happiness: 5, health: 2 } },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/** 한 강아지에게 같이 붙으면 어색한 성격 쌍. */
export const CONFLICTING_TRAITS: ReadonlyArray<readonly [TraitId, TraitId]> = [
  ['timid', 'social'],
  ['homebody', 'social'],
  ['easygoing', 'mischief'],
];

export function traitLabel(id: TraitId, sex: Sex): string {
  const trait = TRAITS[id];
  return sex === 'female' && trait.femaleLabel ? trait.femaleLabel : trait.label;
}

export function traitsConflict(a: TraitId, b: TraitId): boolean {
  return CONFLICTING_TRAITS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}
