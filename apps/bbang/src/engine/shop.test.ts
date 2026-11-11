import { describe, expect, it } from 'vitest';
import {
  EMPTY_WALLET,
  earn,
  maxLevel,
  nextCost,
  NO_UPGRADES,
  pointsFor,
  purchase,
  salePrice,
  shopConfig,
  STANDARD_SHOP,
  UPGRADE_IDS,
} from './shop';

describe('shop config', () => {
  it('is the standard shop with no upgrades', () => {
    expect(shopConfig(NO_UPGRADES)).toEqual(STANDARD_SHOP);
  });

  it('applies each upgrade level', () => {
    const shop = shopConfig({ rack: 2, pans: 2, batter: 2, warmer: 2 });
    expect(shop).toEqual({
      pans: 6,
      rackSlots: 5,
      greenWidthBonus: 0.2,
      coolStepMs: 14_000,
      priceBonus: 200,
      costBonus: 100,
    });
  });
});

describe('money', () => {
  it('prices a bread by filling, grade tip and batter', () => {
    expect(salePrice('red-bean', 'perfect', STANDARD_SHOP)).toBe(1300);
    expect(salePrice('sweet-potato', 'cold', STANDARD_SHOP)).toBe(1200);
    expect(salePrice('custard', 'good', shopConfig({ ...NO_UPGRADES, batter: 1 }))).toBe(1300);
  });

  it('turns net profit into points, never negative', () => {
    expect(pointsFor(20_000, 5_050)).toBe(149);
    expect(pointsFor(1_000, 5_000)).toBe(0);
  });

  it('adds a shift to the wallet', () => {
    expect(earn(EMPTY_WALLET, 20_000, 5_000)).toEqual({
      points: 150,
      totalRevenue: 20_000,
      upgrades: NO_UPGRADES,
    });
  });
});

describe('purchase', () => {
  it('buys the next level when affordable', () => {
    const wallet = { ...EMPTY_WALLET, points: 500 };
    const bought = purchase(wallet, 'rack');
    expect(bought?.points).toBe(250);
    expect(bought?.upgrades.rack).toBe(1);
  });

  it('refuses when short on points or already maxed', () => {
    expect(purchase({ ...EMPTY_WALLET, points: 200 }, 'rack')).toBeNull();
    const maxed = { ...EMPTY_WALLET, points: 9999, upgrades: { ...NO_UPGRADES, rack: maxLevel('rack') } };
    expect(purchase(maxed, 'rack')).toBeNull();
    expect(nextCost('rack', maxLevel('rack'))).toBeNull();
  });

  it('prices every upgrade path with rising costs', () => {
    for (const id of UPGRADE_IDS) {
      let last = 0;
      for (let level = 0; level < maxLevel(id); level += 1) {
        const cost = nextCost(id, level)!;
        expect(cost).toBeGreaterThan(last);
        last = cost;
      }
    }
  });
});
