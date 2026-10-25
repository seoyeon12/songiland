import { getBreed } from './data/breeds';
import { MIN_MONTHS_TOGETHER } from './meeting';
import { advanceMonth, previewMeeting, simulateToEnd, startRun } from './simulation';
import type { RunState } from './types';

function runFor(seed: number): RunState {
  return simulateToEnd(startRun({ seed, name: '보리' }));
}

describe('startRun', () => {
  it('starts with the same dog the meeting preview showed', () => {
    const meeting = previewMeeting(31);
    const run = startRun({ seed: 31, name: '  콩이 ' });
    const dog = run.dogs[0];
    expect(dog.breedId).toBe(meeting.breedId);
    expect(dog.coatId).toBe(meeting.coatId);
    expect(dog.traits).toEqual(meeting.traits);
    expect(dog.ageMonths).toBe(meeting.ageMonths);
    expect(dog.name).toBe('콩이');
    expect(run.log[0]).toMatchObject({ kind: 'meet', text: '콩이와 가족이 됐어요.' });
  });

  it('falls back to a suggested name when the name is blank', () => {
    const meeting = previewMeeting(5);
    expect(startRun({ seed: 5, name: '   ' }).dogs[0].name).toBe(meeting.suggestedNames[0]);
  });
});

describe('advanceMonth', () => {
  it('does not mutate the previous state', () => {
    const start = startRun({ seed: 8, name: '보리' });
    const snapshot = structuredClone(start);
    advanceMonth(start);
    expect(start).toEqual(snapshot);
  });

  it('resumes identically from a saved JSON state', () => {
    let run = startRun({ seed: 77, name: '보리' });
    for (let i = 0; i < 40; i += 1) {
      run = advanceMonth(run);
    }
    const restored = JSON.parse(JSON.stringify(run)) as RunState;
    expect(simulateToEnd(restored)).toEqual(simulateToEnd(run));
  });
});

describe('a whole life', () => {
  const runs = Array.from({ length: 400 }, (_, i) => runFor(1000 + i));

  it('always ends with the first dog crossing the rainbow bridge', () => {
    for (const run of runs) {
      expect(run.status).toBe('ended');
      const dog = run.dogs[0];
      expect(dog.passedMonth).toBe(run.month);
      expect(run.log.at(-1)?.kind).toBe('passed');
      expect(run.timeline).toHaveLength(run.month + 1);
    }
  });

  it('stays within the breed lifespan range, give or take', () => {
    for (const run of runs) {
      const dog = run.dogs[0];
      const [min, max] = getBreed(dog.breedId).lifespanYears;
      expect(dog.ageMonths).toBeGreaterThanOrEqual(
        Math.min(min * 12 - 24, dog.metAgeMonths + MIN_MONTHS_TOGETHER),
      );
      expect(dog.ageMonths).toBeLessThanOrEqual(max * 12 + 18);
      expect(dog.ageMonths - dog.metAgeMonths).toBeGreaterThanOrEqual(MIN_MONTHS_TOGETHER);
    }
  });

  it('keeps a typical run at 10–15 minutes (about 10–15 years together)', () => {
    const together = runs
      .map((run) => run.dogs[0].ageMonths - run.dogs[0].metAgeMonths)
      .sort((a, b) => a - b);
    const median = together[Math.floor(together.length / 2)];
    expect(median).toBeGreaterThanOrEqual(120);
    expect(median).toBeLessThanOrEqual(180);
  });

  it('keeps every stat between 0 and 100', () => {
    for (const run of runs) {
      for (const value of Object.values(run.dogs[0].stats)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
      expect(run.household.ease).toBeGreaterThanOrEqual(0);
      expect(run.household.ease).toBeLessThanOrEqual(100);
    }
  });

  it('logs life stages in order and yearly birthdays', () => {
    const order = ['young', 'adult', 'senior', 'elderly'];
    for (const run of runs.slice(0, 50)) {
      const stageTexts = run.log.filter((entry) => entry.kind === 'stage');
      const seen = stageTexts.map((entry) =>
        order.findIndex((stage) =>
          entry.text.includes(
            { young: '청년', adult: '어른', senior: '시니어', elderly: '노견' }[stage]!,
          ),
        ),
      );
      expect(seen).toEqual([...seen].sort((a, b) => a - b));
      expect(run.log.some((entry) => entry.kind === 'birthday')).toBe(true);
    }
  });

  it('never logs a birthday in the month a dog passes', () => {
    for (const run of runs) {
      const passedMonth = run.dogs[0].passedMonth;
      expect(
        run.log.some((entry) => entry.kind === 'birthday' && entry.month === passedMonth),
      ).toBe(false);
    }
  });

  it('is reproducible from the seed', () => {
    expect(runFor(4242)).toEqual(runFor(4242));
  });

  it('stops advancing once the run has ended', () => {
    const ended = runFor(9);
    expect(advanceMonth(ended)).toBe(ended);
  });
});
