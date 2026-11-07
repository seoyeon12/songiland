import { breedEncounterPercent, breedRarity, BREEDS, getBreed, HEALTH_LABELS } from './breeds';

const HEX = /^#[0-9a-f]{6}$/i;

describe('breed table', () => {
  it('has unique ids and sane lifespans, weights and looks', () => {
    const ids = BREEDS.map((breed) => breed.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const breed of BREEDS) {
      const [min, max] = breed.lifespanYears;
      expect(min).toBeGreaterThanOrEqual(8);
      expect(max).toBeGreaterThan(min);
      expect(max).toBeLessThanOrEqual(20);
      expect(breed.weight).toBeGreaterThan(0);
      expect(breed.coats.length).toBeGreaterThan(0);
      expect(breed.ears.length).toBeGreaterThan(0);
      expect(breed.coatTypes.length).toBeGreaterThan(0);
      expect(breed.tails.length).toBeGreaterThan(0);
      expect(breed.intro).not.toBe('');
      for (const tendency of breed.health) {
        expect(HEALTH_LABELS[tendency]).toBeTruthy();
      }
      const coatIds = breed.coats.map((coat) => coat.id);
      expect(new Set(coatIds).size).toBe(coatIds.length);
      for (const coat of breed.coats) {
        expect(coat.main).toMatch(HEX);
        if (coat.accent) {
          expect(coat.accent).toMatch(HEX);
        }
      }
    }
  });

  it('weights breeds by the 2024 animal-registration figures', () => {
    // 가중치는 전국 등록 비율을 그대로 쓴다: 말티즈 19.8, 푸들 14.1, 믹스 13.3 …
    const mix = BREEDS.filter((breed) => breed.family === 'mix').reduce(
      (sum, breed) => sum + breed.weight,
      0,
    );
    expect(mix).toBe(13);
    expect(getBreed('maltese').weight).toBe(20);
    expect(getBreed('toy-poodle').weight).toBe(14);
    expect(getBreed('pomeranian').weight).toBe(9);
  });

  it('never uses a demeaning name for mixed dogs', () => {
    const text = JSON.stringify(BREEDS);
    expect(text).not.toContain('똥개');
  });

  it('throws for unknown breeds', () => {
    expect(() => getBreed('pet-shop-special')).toThrow();
  });
});

describe('breedRarity', () => {
  it('derives a percentage from the encounter weight', () => {
    expect(breedEncounterPercent('maltese')).toBeGreaterThan(15);
    expect(breedEncounterPercent('dachshund')).toBeLessThan(3);
  });

  it('names the dog and calls a common breed a frequent one', () => {
    const maltese = breedRarity('maltese');
    expect(maltese.headline).toBe('당신이 말티즈를 만날 확률');
    // 등록 20%이지만 게임 견종 합(94)으로 정규화돼 한 자릿수 더 높게 보인다.
    expect(maltese.percent).toBe(21);
    expect(maltese.note).toBe('가장 자주 만나는 견종 중 하나예요');
  });

  it('calls a rare breed an uncommon encounter', () => {
    const dachshund = breedRarity('dachshund');
    expect(dachshund.percent).toBe(2);
    expect(dachshund.note).toBe('흔치 않은 인연이에요');
  });

  it('keeps the rarest breeds at least 1% and calls them precious', () => {
    const beagle = breedRarity('beagle');
    expect(beagle.percent).toBeGreaterThanOrEqual(1);
    expect(beagle.note).toBe('아주 귀한 인연이에요');
  });
});
