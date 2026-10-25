import { moodFor, stageFor, stageStart } from './stages';

it('ages small dogs slower than large dogs', () => {
  expect(stageFor('small', 0)).toBe('puppy');
  expect(stageFor('small', 12)).toBe('young');
  expect(stageFor('small', 36)).toBe('adult');
  expect(stageFor('small', 100)).toBe('senior');
  expect(stageFor('small', 132)).toBe('elderly');
  expect(stageFor('large', 100)).toBe('elderly');
  expect(stageFor('medium', 84)).toBe('senior');
  expect(stageStart('large', 'senior')).toBe(72);
  expect(stageStart('toy', 'puppy')).toBe(0);
});

it('maps happiness to moods', () => {
  expect(moodFor(90)).toBe('great');
  expect(moodFor(60)).toBe('good');
  expect(moodFor(48)).toBe('okay');
  expect(moodFor(30)).toBe('low');
});
