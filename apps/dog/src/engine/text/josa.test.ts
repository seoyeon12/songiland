import { hasFinalConsonant, josa } from './josa';

it('picks particles by the final consonant of the name', () => {
  expect(josa('보리', '이/가')).toBe('보리가');
  expect(josa('콩', '이/가')).toBe('콩이');
  expect(josa('구름이', '은/는')).toBe('구름이는');
  expect(josa('밤', '과/와')).toBe('밤과');
  expect(josa('초코', '과/와')).toBe('초코와');
  expect(josa('황구', '이에요/예요')).toBe('황구예요');
  expect(josa('흑곰', '이에요/예요')).toBe('흑곰이에요');
});

it('treats names ending in non-Hangul characters as having no final consonant', () => {
  expect(hasFinalConsonant('Coco')).toBe(false);
  expect(josa('Coco', '이/가')).toBe('Coco가');
  expect(hasFinalConsonant('')).toBe(false);
});
