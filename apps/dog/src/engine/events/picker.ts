import { toneWeights } from '../data/arcs';
import { getBreed } from '../data/breeds';
import { MAX_DOGS, rapportBetween } from '../family';
import type { Rng } from '../rng';
import type { Arc, Dog, RunState, Tone } from '../types';
import { EVENTS } from './catalog';
import type { BoundKey, Condition, EventCard, Outcome } from './types';

const EVENT_BY_ID = new Map(EVENTS.map((event) => [event.id, event]));

/** 새 식구를 들일 수 있는 사건. */
const ADOPTING = new Set(
  EVENTS.filter((event) =>
    event.choices?.some((choice) => choice.outcomes.some((outcome) => outcome.effects?.adopt)),
  ).map((event) => event.id),
);

/** 새 식구 사건은 견생에서 두 번까지, 앞의 사건과 2년 넘게 떨어져서 열린다. */
export const NEWCOMER_OFFERS = 2;
export const NEWCOMER_GAP = 24;

/**
 * 지금 새 식구 사건이 열릴 수 있는지. 판이 진행 중이고, 가족이 셋보다 적고, 지난 새 식구
 * 사건(들였든 아니든)이 두 번보다 적고 2년 넘게 지났을 때.
 */
export function newcomerOpen(state: RunState): boolean {
  if (state.status !== 'running' || state.dogs.length >= MAX_DOGS) {
    return false;
  }
  const offers = state.log.filter(
    (entry) => entry.kind === 'choice' && entry.eventId && ADOPTING.has(entry.eventId),
  );
  const last = offers.at(-1);
  return offers.length < NEWCOMER_OFFERS && (!last || state.month - last.month >= NEWCOMER_GAP);
}

export function getEvent(id: string): EventCard {
  const event = EVENT_BY_ID.get(id);
  if (!event) {
    throw new Error(`알 수 없는 사건입니다: ${id}`);
  }
  return event;
}

export function monthsTogether(dog: Dog, month: number): number {
  return month - dog.joinedMonth;
}

/** 견생 진행률(0~1). 만난 나이에서 예상 수명까지 중 어디쯤인지. */
export function lifeProgress(dog: Dog): number {
  const span = dog.lifespanMonths - dog.metAgeMonths;
  if (span <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, (dog.ageMonths - dog.metAgeMonths) / span));
}

function boundValue(
  dog: Dog,
  state: RunState,
  key: BoundKey,
  partner: Dog | undefined,
): number | undefined {
  if (key === 'ease') {
    return state.household.ease;
  }
  if (key === 'rapport') {
    return partner ? rapportBetween(state, dog.id, partner.id) : undefined;
  }
  return dog.stats[key];
}

export function meetsCondition(
  when: Condition | undefined,
  dog: Dog,
  state: RunState,
  partner?: Dog,
): boolean {
  if (!when) {
    return true;
  }
  const breed = getBreed(dog.breedId);
  const together = monthsTogether(dog, state.month);
  if (when.breeds && !when.breeds.includes(dog.breedId)) return false;
  if (when.nicknames && (!dog.nickname || !when.nicknames.includes(dog.nickname))) return false;
  if (when.routes && !when.routes.includes(dog.route)) return false;
  if (when.sizes && !when.sizes.includes(breed.size)) return false;
  if (when.coatTypes && !when.coatTypes.includes(dog.look.coatType)) return false;
  if (when.health && !when.health.some((tendency) => breed.health.includes(tendency))) {
    return false;
  }
  if (when.traits && !when.traits.some((trait) => dog.traits.includes(trait))) return false;
  if (when.requires && !when.requires.every((flag) => dog.flags.includes(flag))) return false;
  if (when.excludes && when.excludes.some((flag) => dog.flags.includes(flag))) return false;
  if (when.household && !when.household.some((flag) => state.household.flags.includes(flag))) {
    return false;
  }
  if (
    when.householdExcludes &&
    when.householdExcludes.some((flag) => state.household.flags.includes(flag))
  ) {
    return false;
  }
  for (const [key, value] of Object.entries(when.min ?? {})) {
    const current = boundValue(dog, state, key as BoundKey, partner);
    if (current === undefined || current < value) return false;
  }
  for (const [key, value] of Object.entries(when.max ?? {})) {
    const current = boundValue(dog, state, key as BoundKey, partner);
    if (current === undefined || current > value) return false;
  }
  if (when.minTogether !== undefined && together < when.minTogether) return false;
  if (when.maxTogether !== undefined && together > when.maxTogether) return false;
  if (when.partnerStages && (!partner || !when.partnerStages.includes(partner.stage))) {
    return false;
  }
  if (when.firstInHouse && (!partner || dog.joinedMonth >= partner.joinedMonth)) return false;
  return true;
}

/** 선택 사건은 기본적으로 한 번만, 일상 사건은 기본 24개월마다 다시 나올 수 있다. */
export function isRepeatAllowed(event: EventCard, dog: Dog, month: number): boolean {
  const last = dog.seen[event.id];
  if (last === undefined) {
    return true;
  }
  const once = event.once ?? event.choices !== undefined;
  if (once) {
    return false;
  }
  return month - last >= (event.cooldown ?? 24);
}

/**
 * 이 아이에게 지금 이 사건이 일어날 수 있는지. 짝 사건은 짝이 있어야 하고 둘 다, 집 사건은
 * 가족 모두가 한동안 같은 사건을 겪지 않았어야 한다. 새 식구 사건은 newcomerOpen일 때만.
 */
export function isAvailable(event: EventCard, dog: Dog, state: RunState, partner?: Dog): boolean {
  if (event.pair && !partner) {
    return false;
  }
  if (ADOPTING.has(event.id) && !newcomerOpen(state)) {
    return false;
  }
  const mate = event.pair ? partner : undefined;
  const witnesses = event.household ? state.dogs : mate ? [dog, mate] : [dog];
  return (
    event.stages.includes(dog.stage) &&
    witnesses.every((witness) => isRepeatAllowed(event, witness, state.month)) &&
    meetsCondition(event.when, dog, state, mate)
  );
}

function eventWeight(event: EventCard, dog: Dog): number {
  const base = event.weight ?? 1;
  const boosted = event.boostTraits?.some((trait) => dog.traits.includes(trait));
  return base * (boosted ? 3 : 1);
}

const TONES: readonly Tone[] = ['cheerful', 'calm', 'touching'];

/**
 * 이야기 흐름에 맞춰 사건을 고른다. 먼저 지금 진행률의 톤 가중치로 톤을 정하고,
 * 그 톤을 가진 사건 중에서 고른다. 고를 수 있는 사건이 없는 톤은 건너뛴다.
 */
export function pickByTone(
  rng: Rng,
  candidates: readonly EventCard[],
  dog: Dog,
  arc: Arc,
): { event: EventCard; tone: Tone } | null {
  const usable = candidates.filter((event) => eventWeight(event, dog) > 0);
  if (usable.length === 0) {
    return null;
  }
  const weights = toneWeights(arc, lifeProgress(dog));
  const tones = TONES.filter((tone) => usable.some((event) => event.tones.includes(tone)));
  const total = tones.reduce((sum, tone) => sum + weights[tone], 0);
  const tone =
    total > 0 ? rng.weighted(tones, (entry) => weights[entry]) : rng.pick(tones);
  const event = rng.weighted(
    usable.filter((entry) => entry.tones.includes(tone)),
    (entry) => eventWeight(entry, dog),
  );
  return { event, tone };
}

/** 능력치(짝 사건이면 사이도)가 결과 확률을 기울인다. 0.5배~1.5배 사이. */
export function outcomeWeight(outcome: Outcome, dog: Dog, rapport?: number): number {
  const value = (key: NonNullable<Outcome['favoredBy']>) =>
    key === 'rapport' ? (rapport ?? 50) : dog.stats[key];
  let weight = outcome.weight;
  if (outcome.favoredBy) {
    weight *= 0.5 + value(outcome.favoredBy) / 100;
  }
  if (outcome.hinderedBy) {
    weight *= 1.5 - value(outcome.hinderedBy) / 100;
  }
  return weight;
}
