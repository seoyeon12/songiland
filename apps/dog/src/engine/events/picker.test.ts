import { createRng } from '../rng';
import { startRun } from '../simulation';
import type { Dog, RunState } from '../types';
import { EVENTS } from './catalog';
import {
  getEvent,
  isRepeatAllowed,
  lifeProgress,
  meetsCondition,
  outcomeWeight,
  pickByTone,
} from './picker';

function stateWith(dog: Partial<Dog>, extra: Partial<RunState> = {}): RunState {
  const run = startRun({ seed: 1, name: '보리' });
  return { ...run, ...extra, dogs: [{ ...run.dogs[0], ...dog }] };
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
  });
});
