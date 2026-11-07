import { describe, expect, it } from 'vitest';
import { simulateToEnd, startRun } from '../simulation';
import { EVENTS } from '../events/catalog';
import {
  computeCost,
  COST_CATEGORY_IDS,
  COST_TABLE,
  formatManwon,
  NATIONAL,
} from './costs';

const EVENT_IDS = new Set(EVENTS.map((event) => event.id));

describe('cost table', () => {
  it('only prices real events with valid categories and positive amounts', () => {
    for (const [id, cost] of Object.entries(COST_TABLE.EVENT_COSTS)) {
      expect(EVENT_IDS.has(id), `알 수 없는 사건 id: ${id}`).toBe(true);
      expect(COST_CATEGORY_IDS).toContain(cost!.category);
      expect(cost!.amount).toBeGreaterThan(0);
    }
  });

  it('prices flags with valid categories and positive amounts', () => {
    for (const cost of Object.values(COST_TABLE.FLAG_COSTS)) {
      expect(COST_CATEGORY_IDS).toContain(cost!.category);
      expect(cost!.amount).toBeGreaterThan(0);
    }
  });
});

describe('computeCost', () => {
  it('is deterministic for the same seed', () => {
    const a = computeCost(simulateToEnd(startRun({ seed: 7, name: '보리' })));
    const b = computeCost(simulateToEnd(startRun({ seed: 7, name: '보리' })));
    expect(a).toEqual(b);
  });

  it('category amounts sum to the total and the monthly average is sane', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const cost = computeCost(simulateToEnd(startRun({ seed, name: '두부' })));
      const sum = COST_CATEGORY_IDS.reduce((total, key) => total + cost.byCategory[key], 0);
      expect(sum).toBe(cost.total);
      expect(cost.total).toBeGreaterThan(0);
      expect(cost.dogMonths).toBeGreaterThan(0);
      // 한 마리당 월평균은 전국 평균(17.5만원) 언저리의 상식적인 범위 안에 든다.
      expect(cost.monthlyAverage).toBeGreaterThan(5);
      expect(cost.monthlyAverage).toBeLessThan(40);
    }
  });

  it('food and base care always cost something for a dog that lived', () => {
    const cost = computeCost(simulateToEnd(startRun({ seed: 3, name: '콩이' })));
    expect(cost.byCategory.food).toBeGreaterThan(0);
  });
});

describe('formatManwon', () => {
  it('reads thousands with a comma and crosses into 억', () => {
    expect(formatManwon(2460)).toBe('2,460만원');
    expect(formatManwon(10000)).toBe('1억원');
    expect(formatManwon(12340)).toBe('1억 2,340만원');
  });
});

describe('national averages', () => {
  it('keeps a source string for the ending card footnote', () => {
    expect(NATIONAL.source.length).toBeGreaterThan(0);
    expect(NATIONAL.monthly).toBeGreaterThan(NATIONAL.monthlyVet);
  });
});
