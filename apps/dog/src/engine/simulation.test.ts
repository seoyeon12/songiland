import { runAwaitingNewcomer } from '../test/runs';
import { getBreed } from './data/breeds';
import { MIN_MONTHS_TOGETHER } from './meeting';
import { EVENTS } from './events/catalog';
import { NEWCOMER_GAP } from './events/picker';
import { MAX_DOGS } from './family';
import {
  advanceMonth,
  advanceUntilChoice,
  autoChoose,
  autoWelcome,
  choose,
  previewMeeting,
  simulateToEnd,
  startRun,
  welcome,
} from './simulation';
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
      const stageTexts = run.log.filter(
        (entry) => entry.kind === 'stage' && entry.dogId === run.dogs[0].id,
      );
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
      for (const dog of run.dogs) {
        expect(
          run.log.some(
            (entry) =>
              entry.kind === 'birthday' &&
              entry.dogId === dog.id &&
              entry.month === dog.passedMonth,
          ),
        ).toBe(false);
      }
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

describe('choice cards', () => {
  it('pauses the clock until a choice is made', () => {
    const waiting = advanceUntilChoice(startRun({ seed: 12, name: '보리' }));
    expect(waiting.pendingChoice).not.toBeNull();
    expect(advanceMonth(waiting)).toBe(waiting);
    const pending = waiting.pendingChoice!;
    expect(pending.choices.length).toBeGreaterThanOrEqual(2);
    expect(pending.text).not.toMatch(/[{}]/);

    const chosen = choose(waiting, pending.choices[0].id);
    expect(chosen.pendingChoice).toBeNull();
    const entry = chosen.log.at(-1)!;
    expect(entry.kind).toBe('choice');
    expect(entry.choice).toBe(pending.choices[0].label);
    expect(entry.eventId).toBe(pending.eventId);
    expect(() => choose(chosen, 'nope')).toThrow();
    expect(() => choose(waiting, 'nope')).toThrow();
  });

  it('resumes identically from JSON while a choice is waiting', () => {
    const waiting = advanceUntilChoice(startRun({ seed: 21, name: '보리' }));
    const restored = JSON.parse(JSON.stringify(waiting)) as RunState;
    expect(simulateToEnd(restored)).toEqual(simulateToEnd(waiting));
  });
});

describe('events over many lives', () => {
  const runs = Array.from({ length: 600 }, (_, i) =>
    simulateToEnd(startRun({ seed: 7000 + i, name: '보리' })),
  );

  it('shows a choice card every so often, not every minute', () => {
    const counts = runs
      .map((run) => run.log.filter((entry) => entry.kind === 'choice').length)
      .sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)];
    expect(median).toBeGreaterThanOrEqual(6);
    expect(median).toBeLessThanOrEqual(20);
  });

  it('lets most events happen somewhere across many lives', () => {
    const seen = new Set(runs.flatMap((run) => run.log.map((entry) => entry.eventId)));
    const randomEvents = EVENTS.filter((event) => (event.weight ?? 1) > 0);
    const missing = randomEvents.filter((event) => !seen.has(event.id)).map((e) => e.id);
    expect(missing.length, missing.join(', ')).toBeLessThanOrEqual(
      Math.floor(randomEvents.length * 0.1),
    );
  });

  it('tells sadder stories in touching arcs than in cheerful ones', () => {
    const touchingShare = (arc: RunState['arc']) => {
      const entries = runs
        .filter((run) => run.arc === arc)
        .flatMap((run) => run.log.filter((entry) => entry.tone));
      return entries.filter((entry) => entry.tone === 'touching').length / entries.length;
    };
    expect(touchingShare('cheerful')).toBeLessThan(touchingShare('calmTouching'));
    expect(touchingShare('cheerful')).toBeLessThan(touchingShare('laughThenTears'));
  });

  it('never lets auto-decide choose to say goodbye', () => {
    for (const run of runs) {
      expect(run.log.some((entry) => entry.choice?.includes('편안하게 보내 주기'))).toBe(false);
    }
  });
});

describe('saying goodbye', () => {
  it('only asks when an elderly dog has an incurable illness and is very weak', () => {
    let asked = 0;
    for (let i = 0; i < 400 && asked < 5; i += 1) {
      let run = startRun({ seed: 90000 + i, name: '보리' });
      while (run.status === 'running') {
        run = advanceUntilChoice(run);
        const pending = run.pendingChoice;
        if (!pending) {
          break;
        }
        if (pending.eventId === 'farewell') {
          const dog = run.dogs[0];
          expect(dog.stage).toBe('elderly');
          expect(dog.flags).toContain('terminal-illness');
          expect(dog.stats.health).toBeLessThanOrEqual(35);
          expect(pending.alwaysAsk).toBe(true);
          asked += 1;
          const after = choose(run, 'peaceful');
          expect(after.status).toBe('ended');
          expect(after.dogs[0].passedMonth).toBe(after.month);
          expect(after.log.at(-1)).toMatchObject({ kind: 'passed', memorable: true });
          break;
        }
        run = autoChoose(run);
      }
    }
    expect(asked).toBeGreaterThan(0);
  });
});

describe('a family of dogs', () => {
  const runs = Array.from({ length: 400 }, (_, i) =>
    simulateToEnd(startRun({ seed: 3000 + i, name: '보리' })),
  );
  const families = runs.filter((run) => run.dogs.length > 1);

  it('welcomes new family members now and then, never more than three dogs', () => {
    expect(families.length / runs.length).toBeGreaterThan(0.3);
    expect(families.length / runs.length).toBeLessThan(0.85);
    expect(runs.some((run) => run.dogs.length === MAX_DOGS)).toBe(true);
    for (const run of runs) {
      expect(run.dogs.length).toBeLessThanOrEqual(MAX_DOGS);
      expect(new Set(run.dogs.map((dog) => dog.name)).size).toBe(run.dogs.length);
    }
  });

  it('only after the first dog has been home a year, and two years apart', () => {
    for (const run of families) {
      const joined = run.dogs.slice(1).map((dog) => dog.joinedMonth);
      expect(joined[0]).toBeGreaterThanOrEqual(12);
      if (joined.length === 2) {
        expect(joined[1] - joined[0]).toBeGreaterThanOrEqual(NEWCOMER_GAP);
      }
    }
  });

  it('keeps how close every two dogs are between 0 and 100', () => {
    for (const run of families) {
      // 새 식구는 그때 집에 있던 아이들과만 사이가 생긴다(첫째는 판 내내 집에 있다).
      const dogs = run.dogs.length;
      expect(run.pairs.length).toBeGreaterThanOrEqual(dogs - 1);
      expect(run.pairs.length).toBeLessThanOrEqual((dogs * (dogs - 1)) / 2);
      for (const pair of run.pairs) {
        expect(pair.rapport).toBeGreaterThanOrEqual(0);
        expect(pair.rapport).toBeLessThanOrEqual(100);
      }
    }
    expect(families.some((run) => run.log.some((entry) => entry.partnerId))).toBe(true);
  });

  it("ends with the first dog's life and tells the rest of the others' lives", () => {
    for (const run of runs) {
      expect(run.status).toBe('ended');
      expect(run.dogs[0].passedMonth).toBe(run.month);
      const remaining = run.dogs.filter((dog) => dog.passedMonth === null);
      if (remaining.length === 0) {
        expect(run.epilogue).toBeNull();
        continue;
      }
      const epilogue = run.epilogue!;
      expect(epilogue.dogs.map((dog) => dog.id)).toEqual(remaining.map((dog) => dog.id));
      for (const dog of epilogue.dogs) {
        expect(dog.passedMonth).toBeGreaterThan(run.month);
        // 첫째를 그리워하는 이야기는 다음 달부터 한 아이씩 온다(그 전에 떠나는 아이는 빼고).
        if (dog.passedMonth! > run.month + epilogue.dogs.length) {
          expect(
            epilogue.log.some(
              (entry) =>
                entry.eventId === 'missing-friend' &&
                entry.dogId === dog.id &&
                entry.partnerId === run.dogs[0].id,
            ),
          ).toBe(true);
        }
      }
      expect(epilogue.log.every((entry) => entry.month > run.month)).toBe(true);
      expect(run.timeline).toHaveLength(run.month + 1);
    }
    expect(runs.some((run) => run.epilogue)).toBe(true);
  });

  it('lets the others remember a dog that leaves before the first', () => {
    const leftEarly = (run: RunState) =>
      run.dogs.find(
        (dog, i) => i > 0 && dog.passedMonth !== null && dog.passedMonth < run.month,
      );
    const early = families.filter(leftEarly);
    expect(early.length).toBeGreaterThan(0);
    for (const run of early) {
      const gone = leftEarly(run)!;
      expect(run.log.some((entry) => entry.kind === 'passed' && entry.dogId === gone.id)).toBe(
        true,
      );
    }
    expect(
      early.some((run) =>
        run.log.some((entry) => entry.eventId === 'missing-friend' && entry.partnerId),
      ),
    ).toBe(true);
  });
});

describe('welcoming a newcomer', () => {
  const waiting = runAwaitingNewcomer();
  const pending = waiting.pendingMeeting!;

  it('waits for a name before time moves on', () => {
    expect(advanceMonth(waiting)).toBe(waiting);
    expect(advanceUntilChoice(waiting)).toBe(waiting);
    expect(pending.meeting.suggestedNames).not.toContain('보리');
    const restored = JSON.parse(JSON.stringify(waiting)) as RunState;
    expect(simulateToEnd(restored)).toEqual(simulateToEnd(waiting));
  });

  it('adds the named dog, a rapport with each dog at home and a first meeting', () => {
    const after = welcome(waiting, '  두부 ');
    const newcomer = after.dogs.at(-1)!;
    expect(after.pendingMeeting).toBeNull();
    expect(after.dogs).toHaveLength(waiting.dogs.length + 1);
    expect(newcomer).toMatchObject({
      name: '두부',
      breedId: pending.meeting.breedId,
      joinedMonth: waiting.month,
      passedMonth: null,
    });
    expect(after.pairs.filter((pair) => pair.dogIds.includes(newcomer.id))).toHaveLength(
      waiting.dogs.filter((dog) => dog.passedMonth === null).length,
    );
    expect(after.log.at(-1)).toMatchObject({ kind: 'meet', dogId: newcomer.id, memorable: true });
    expect(after.log.at(-1)!.text).toContain('두부가 새 식구가 됐어요.');

    const meeting = advanceUntilChoice(after);
    expect(meeting.pendingChoice).toMatchObject({
      eventId: 'first-meeting',
      dogId: pending.hostId,
      partnerId: newcomer.id,
    });
    expect(meeting.pendingChoice!.text).toContain('두부');
  });

  it('uses a suggested name when the name is blank or already taken', () => {
    const suggested = pending.meeting.suggestedNames[0];
    expect(welcome(waiting, '보리').dogs.at(-1)!.name).toBe(suggested);
    expect(welcome(waiting, '   ').dogs.at(-1)!.name).toBe(suggested);
    expect(autoWelcome(waiting)).toEqual(welcome(waiting, ''));
    expect(() => welcome(welcome(waiting, '두부'), '콩')).toThrow();
  });
});
