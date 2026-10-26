import { createRng } from '../rng';
import { startRun } from '../simulation';
import type { Dog, RunState } from '../types';
import { EVENTS } from './catalog';
import {
  getEvent,
  isAvailable,
  isRepeatAllowed,
  lifeProgress,
  meetsCondition,
  newcomerOpen,
  outcomeWeight,
  pickByTone,
} from './picker';

function stateWith(dog: Partial<Dog>, extra: Partial<RunState> = {}): RunState {
  const run = startRun({ seed: 1, name: '보리' });
  return { ...run, ...extra, dogs: [{ ...run.dogs[0], ...dog }] };
}

/** 어른 첫째(보리)와 스무 달 전에 온 어른 둘째(콩). 사이는 60. */
function familyState(rapport = 60): RunState {
  const run = startRun({ seed: 1, name: '보리' });
  const first: Dog = { ...run.dogs[0], ageMonths: 40, stage: 'adult' };
  const second: Dog = { ...first, id: 'dog-2', name: '콩', joinedMonth: 20, ageMonths: 30 };
  return {
    ...run,
    month: 40,
    dogs: [first, second],
    pairs: [{ dogIds: ['dog-1', 'dog-2'], rapport }],
  };
}

describe('meetsCondition', () => {
  it('checks breed health tendencies, flags, stats and time together', () => {
    const state = stateWith({ breedId: 'maltese', flags: ['neutered'] }, { month: 30 });
    const dog = state.dogs[0];
    expect(meetsCondition({ health: ['patella'] }, dog, state)).toBe(true);
    expect(meetsCondition({ health: ['disc'] }, dog, state)).toBe(false);
    expect(meetsCondition({ excludes: ['neutered'] }, dog, state)).toBe(false);
    expect(meetsCondition({ requires: ['neutered'] }, dog, state)).toBe(true);
    expect(meetsCondition({ minTogether: 24 }, dog, state)).toBe(true);
    expect(meetsCondition({ maxTogether: 2 }, dog, state)).toBe(false);
    expect(meetsCondition({ min: { ease: 101 } }, dog, state)).toBe(false);
    expect(meetsCondition({ household: ['yard'] }, dog, state)).toBe(false);
  });
});

describe('two-dog events', () => {
  it('need a partner, and check rapport, who came first and the partner stage', () => {
    const state = familyState();
    const [first, second] = state.dogs;
    const nap = getEvent('nap-pile');
    expect(isAvailable(nap, first, state)).toBe(false);
    expect(isAvailable(nap, first, state, second)).toBe(true);
    expect(isAvailable(nap, first, familyState(40), second)).toBe(false);
    expect(meetsCondition({ firstInHouse: true }, first, state, second)).toBe(true);
    expect(meetsCondition({ firstInHouse: true }, second, state, first)).toBe(false);
    expect(meetsCondition({ partnerStages: ['puppy'] }, first, state, second)).toBe(false);
    expect(meetsCondition({ min: { rapport: 10 } }, first, state)).toBe(false);
  });

  it('let household events happen once per home, not once per dog', () => {
    const trip = getEvent('trip');
    const state = familyState();
    expect(isAvailable(trip, state.dogs[1], state)).toBe(true);
    const seen = { ...state, dogs: [{ ...state.dogs[0], seen: { trip: 10 } }, state.dogs[1]] };
    expect(isAvailable(trip, seen.dogs[1], seen)).toBe(false);
  });
});

describe('newcomerOpen', () => {
  const asked = (month: number) => ({
    month,
    dogId: 'dog-1',
    kind: 'choice' as const,
    text: '',
    eventId: 'new-family',
  });

  it('opens at most twice a life, two years apart', () => {
    const base = stateWith({}, { month: 30 });
    expect(newcomerOpen(base)).toBe(true);
    expect(newcomerOpen({ ...base, log: [...base.log, asked(20)] })).toBe(false);
    expect(newcomerOpen({ ...base, month: 44, log: [...base.log, asked(20)] })).toBe(true);
    expect(newcomerOpen({ ...base, month: 90, log: [...base.log, asked(20), asked(50)] })).toBe(
      false,
    );
  });

  it('stays closed once the run ends or three dogs live together', () => {
    expect(newcomerOpen(stateWith({}, { status: 'ended' }))).toBe(false);
    const family = familyState();
    const three = { ...family, dogs: [...family.dogs, { ...family.dogs[1], id: 'dog-3' }] };
    expect(newcomerOpen(three)).toBe(false);
  });
});

describe('isRepeatAllowed', () => {
  it('fires choice events once and daily events again after the cooldown', () => {
    const choiceEvent = getEvent('potty-training');
    const daily = getEvent('zoomies');
    const dog = stateWith({ seen: { 'potty-training': 3, zoomies: 3 } }).dogs[0];
    expect(isRepeatAllowed(choiceEvent, dog, 100)).toBe(false);
    expect(isRepeatAllowed(daily, dog, 20)).toBe(false);
    expect(isRepeatAllowed(daily, dog, 27)).toBe(true);
  });
});

describe('pickByTone', () => {
  it('follows the arc: touching events early in a tears-then-laugh life', () => {
    const dog = stateWith({ ageMonths: 3, metAgeMonths: 3, lifespanMonths: 160 }).dogs[0];
    expect(lifeProgress(dog)).toBe(0);
    const pool = EVENTS.filter((event) => ['zoomies', 'thunder', 'sunbath'].includes(event.id));
    const rng = createRng(5);
    let touching = 0;
    for (let i = 0; i < 2000; i += 1) {
      if (pickByTone(rng, pool, dog, 'tearsThenLaugh')!.tone === 'touching') {
        touching += 1;
      }
    }
    expect(touching / 2000).toBeGreaterThan(0.5);
  });

  it('returns null when nothing is available', () => {
    const dog = stateWith({}).dogs[0];
    expect(pickByTone(createRng(1), [], dog, 'cheerful')).toBeNull();
  });
});

describe('outcomeWeight', () => {
  it('tilts outcomes by stats between half and one and a half', () => {
    const dog = stateWith({ stats: { health: 100, happiness: 0, bond: 0, sociability: 50 } })
      .dogs[0];
    expect(outcomeWeight({ weight: 2, favoredBy: 'health', text: '' }, dog)).toBe(3);
    expect(outcomeWeight({ weight: 2, favoredBy: 'bond', text: '' }, dog)).toBe(1);
    expect(outcomeWeight({ weight: 2, hinderedBy: 'bond', text: '' }, dog)).toBe(3);
    expect(outcomeWeight({ weight: 2, favoredBy: 'rapport', text: '' }, dog, 100)).toBe(3);
    expect(outcomeWeight({ weight: 2, favoredBy: 'rapport', text: '' }, dog)).toBe(2);
  });
});
