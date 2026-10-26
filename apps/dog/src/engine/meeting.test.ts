import { BREEDS, getBreed } from './data/breeds';
import { traitsConflict } from './data/traits';
import { drawMeeting, nicknameFor } from './meeting';
import { createRng } from './rng';
import { stageStart } from './stages';
import type { Meeting } from './types';

function sample(count: number, seed = 2026): Meeting[] {
  const meetings: Meeting[] = [];
  for (let i = 0; i < count; i += 1) {
    meetings.push(drawMeeting(createRng(seed + i)));
  }
  return meetings;
}

describe('drawMeeting', () => {
  const meetings = sample(5000);

  it('is deterministic for a seed', () => {
    expect(drawMeeting(createRng(99))).toEqual(drawMeeting(createRng(99)));
  });

  it('only uses adoption, rural, rescue and acquaintance routes', () => {
    const routes = new Set(meetings.map((meeting) => meeting.route));
    expect([...routes].sort()).toEqual(['acquaintance', 'rescue', 'rural', 'shelter']);
  });

  it('only meets mixed dogs and Jindos in a rural yard', () => {
    for (const meeting of meetings.filter((m) => m.route === 'rural')) {
      expect(getBreed(meeting.breedId).family).not.toBe('purebred');
    }
  });

  it('draws mixed dogs about as often as Korean registrations', () => {
    const mixed = meetings.filter((m) => getBreed(m.breedId).family === 'mix').length;
    expect(mixed / meetings.length).toBeGreaterThan(0.17);
    expect(mixed / meetings.length).toBeLessThan(0.24);
    const seen = new Set(meetings.map((meeting) => meeting.breedId));
    expect(seen.size).toBe(BREEDS.length);
  });

  it('leaves time together even when adopting a senior dog', () => {
    for (const meeting of meetings) {
      const [minYears] = getBreed(meeting.breedId).lifespanYears;
      expect(meeting.ageMonths).toBeGreaterThanOrEqual(2);
      expect(meeting.ageMonths).toBeLessThanOrEqual(minYears * 12 - 24);
    }
    expect(meetings.some((m) => m.route === 'shelter' && m.ageMonths >= 84)).toBe(true);
  });

  it('gives two different, compatible traits and four distinct name ideas', () => {
    for (const meeting of meetings) {
      const [a, b] = meeting.traits;
      expect(a).not.toBe(b);
      expect(traitsConflict(a, b)).toBe(false);
      expect(new Set(meeting.suggestedNames).size).toBe(meeting.suggestedNames.length);
      expect(meeting.suggestedNames.length).toBeGreaterThanOrEqual(4);
      expect(meeting.intro.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('sometimes suggests the name 송이 for a bichon', () => {
    const bichons = sample(40000, 7).filter((m) => m.breedId === 'bichon');
    expect(bichons.some((m) => m.suggestedNames.includes('송이'))).toBe(true);
    const others = meetings.filter((m) => m.breedId !== 'bichon');
    expect(others.some((m) => m.suggestedNames.includes('송이'))).toBe(false);
  });
});

describe('drawMeeting for a new family member', () => {
  const draw = (wish: Parameters<typeof drawMeeting>[1], count = 500) =>
    Array.from({ length: count }, (_, i) => drawMeeting(createRng(800 + i), wish));

  it('meets the wished route, and only breeds that can be met that way', () => {
    for (const meeting of draw({ route: 'rural' })) {
      expect(meeting.route).toBe('rural');
      expect(getBreed(meeting.breedId).family).not.toBe('purebred');
      expect(meeting.nickname === '시고르자브종' || meeting.nickname === null).toBe(true);
    }
    expect(draw({ route: 'rural' }).some((m) => m.nickname === '시고르자브종')).toBe(true);
  });

  it('meets a senior at the shelter when asked', () => {
    for (const meeting of draw({ route: 'shelter', senior: true })) {
      expect(meeting.route).toBe('shelter');
      expect(meeting.ageMonths).toBeGreaterThanOrEqual(
        stageStart(getBreed(meeting.breedId).size, 'senior'),
      );
    }
  });

  it('never suggests a name already in the family', () => {
    for (const meeting of draw({ takenNames: ['콩이', '보리', '송이'] })) {
      expect(meeting.suggestedNames).not.toContain('콩이');
      expect(meeting.suggestedNames).not.toContain('보리');
      expect(meeting.suggestedNames).not.toContain('송이');
      expect(meeting.suggestedNames).toHaveLength(4);
    }
  });
});

describe('nicknameFor', () => {
  it('applies meme nicknames on top of the base breed', () => {
    expect(nicknameFor(getBreed('mix-small'), 'white', 'rural')).toBe('시고르자브종');
    expect(nicknameFor(getBreed('mix-medium'), 'hwanggu', 'shelter')).toBe('진도믹스');
    expect(nicknameFor(getBreed('mix-medium'), 'hwanggu', 'rural')).toBe('시고르자브종');
    expect(nicknameFor(getBreed('golden-retriever'), 'gold', 'acquaintance')).toBe('골댕이');
    expect(nicknameFor(getBreed('maltese'), 'white', 'shelter')).toBeNull();
  });
});
