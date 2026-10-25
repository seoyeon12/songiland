import { formatAge, formatMonths, summarize } from './record';
import { simulateToEnd, startRun } from './simulation';

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
});
