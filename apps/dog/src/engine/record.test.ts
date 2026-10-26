import { formatAge, formatMonths, summarize } from './record';
import { simulateToEnd, startRun } from './simulation';
import type { RunState } from './types';

it('formats ages like people say them', () => {
  expect(formatAge(4)).toBe('4개월');
  expect(formatAge(12)).toBe('1살');
  expect(formatAge(170)).toBe('14살');
});

it('formats months for people', () => {
  expect(formatMonths(3)).toBe('3개월');
  expect(formatMonths(24)).toBe('2년');
  expect(formatMonths(38)).toBe('3년 2개월');
});

it('summarizes a finished life for the ending card', () => {
  const run = simulateToEnd(startRun({ seed: 2024, name: '두부' }));
  const record = summarize(run);
  expect(record.ended).toBe(true);
  expect(record.dog.name).toBe('두부');
  expect(record.dog.traits).toHaveLength(2);
  expect(record.dog.monthsTogether).toBe(run.dogs[0].ageMonths - run.dogs[0].metAgeMonths);
  expect(record.arcTitle).not.toBe('');
  expect(record.timeline.length).toBe(run.month + 1);
  expect(record.highlights.length).toBeGreaterThan(0);
  expect(record.highlights.length).toBeLessThanOrEqual(3);
  expect(record.choicesMade).toBeGreaterThan(0);
});

it('keeps a record card for every other dog in the family', () => {
  const runs: RunState[] = [];
  for (let seed = 3000; runs.length < 2 && seed < 3400; seed += 1) {
    const run = simulateToEnd(startRun({ seed, name: '두부' }));
    const leftFirst = run.dogs.slice(1).some((dog) => dog.passedMonth !== null);
    if (run.epilogue || leftFirst) {
      runs.push(run);
    }
  }
  expect(runs.length).toBe(2);
  for (const run of runs) {
    const record = summarize(run);
    expect(record.family).toHaveLength(run.dogs.length - 1);
    for (const member of record.family) {
      expect(member.dog.passedMonth).not.toBeNull();
      expect(member.farewell).not.toBeNull();
      expect(member.summary.monthsTogether).toBe(member.dog.ageMonths - member.dog.metAgeMonths);
      expect(member.highlights.length).toBeGreaterThan(0);
      expect(member.highlights.every((moment) => moment.month <= member.dog.passedMonth!)).toBe(
        true,
      );
      if (member.leftFirst) {
        expect(member.monthsAfter).toBe(0);
      } else {
        expect(member.monthsAfter).toBe(member.dog.passedMonth! - run.month);
      }
    }
  }
});
