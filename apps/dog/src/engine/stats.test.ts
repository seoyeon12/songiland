import { describe, expect, it } from 'vitest';
import { TRAIT_IDS, traitsConflict } from './data/traits';
import { simulateToEnd, startRun } from './simulation';
import { comboEncounter, lifeStats, traitPairProbability } from './stats';

describe('traitPairProbability', () => {
  it('is symmetric and zero for an impossible pair', () => {
    expect(traitPairProbability('foodie', 'clingy')).toBeCloseTo(
      traitPairProbability('clingy', 'foodie'),
    );
    expect(traitPairProbability('foodie', 'foodie')).toBe(0);
    expect(traitPairProbability('timid', 'social')).toBe(0); // 충돌 쌍은 나오지 않는다
  });

  it('sums to 1 over every possible pair', () => {
    let sum = 0;
    for (let i = 0; i < TRAIT_IDS.length; i += 1) {
      for (let j = i + 1; j < TRAIT_IDS.length; j += 1) {
        if (!traitsConflict(TRAIT_IDS[i], TRAIT_IDS[j])) {
          sum += traitPairProbability(TRAIT_IDS[i], TRAIT_IDS[j]);
        }
      }
    }
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('comboEncounter', () => {
  it('gives a probability in (0,1] and three parts', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const combo = comboEncounter(simulateToEnd(startRun({ seed, name: '보리' })));
      expect(combo.probability).toBeGreaterThan(0);
      expect(combo.probability).toBeLessThanOrEqual(1);
      expect(combo.oneIn).toBeGreaterThanOrEqual(1);
      expect(combo.parts).toHaveLength(3);
    }
  });
});

describe('lifeStats', () => {
  it('is deterministic and classifies lifespan against the breed range', () => {
    const run = simulateToEnd(startRun({ seed: 11, name: '초코' }));
    const stats = lifeStats(run);
    expect(lifeStats(run)).toEqual(stats);
    expect(['short', 'typical', 'long']).toContain(stats.lifespan.band);
    expect(stats.lifespan.breedLow).toBeLessThanOrEqual(stats.lifespan.breedHigh);
  });

  it('only cites figures backed by the source study', () => {
    // 원문(Salonen 2020)에 대응 수치가 있는 행동만 비교값을 갖는다. 나머지는 지어내지 않고 비운다.
    const withFigure = new Set(['separation-anxiety', 'isolation-distress', 'aggression']);
    for (let seed = 1; seed <= 60; seed += 1) {
      const stats = lifeStats(simulateToEnd(startRun({ seed, name: '두부' })));
      for (const behavior of stats.behaviors) {
        if (withFigure.has(behavior.id)) {
          expect(behavior.typicalPercent).toBeGreaterThan(0);
        } else {
          expect(behavior.typicalPercent).toBeNull();
        }
      }
    }
  });
});
