import { BREEDS, getBreed, HEALTH_LABELS } from './breeds';

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

  it('weights mixed dogs and Maltese like Korean registrations (about 20% and 17%)', () => {
    const total = BREEDS.reduce((sum, breed) => sum + breed.weight, 0);
    const mix = BREEDS.filter((breed) => breed.family === 'mix').reduce(
      (sum, breed) => sum + breed.weight,
      0,
    );
    expect(mix / total).toBeCloseTo(0.2, 1);
    expect(getBreed('maltese').weight / total).toBeCloseTo(0.17, 1);
  });

  it('never uses a demeaning name for mixed dogs', () => {
    const text = JSON.stringify(BREEDS);
    expect(text).not.toContain('똥개');
  });

  it('throws for unknown breeds', () => {
    expect(() => getBreed('pet-shop-special')).toThrow();
  });
});
