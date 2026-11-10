import type { FillingId, ServedGrade } from './types';

/**
 * 가게 설정. 오늘의 장사(랭킹)는 늘 표준 가게(STANDARD_SHOP)로, '내 가게' 모드는 상점에서 산
 * 업그레이드를 반영한 가게로 장사한다(기획서 15장).
 */
export type ShopConfig = {
  /** 굽는 틀 칸 수. */
  pans: number;
  /** 거치대 칸 수. */
  rackSlots: number;
  /** 초록 구간 폭을 이만큼 넓힌다(0.1 = +10%). */
  greenWidthBonus: number;
  /** 거치대에서 이만큼 지날 때마다 한 단계씩 식는다(ms). */
  coolStepMs: number;
  /** 붕어빵 하나 판매가에 더하는 값(원). */
  priceBonus: number;
  /** 반죽 하나 재료비에 더하는 값(원). */
  costBonus: number;
};

export const STANDARD_SHOP: ShopConfig = {
  pans: 4,
  rackSlots: 3,
  greenWidthBonus: 0,
  coolStepMs: 8000,
  priceBonus: 0,
  costBonus: 0,
};

// --- 매출과 재료비 (15.2) ---

/** 붕어빵 하나 판매가(원). "1,000원에 단 한 마리" 밈(12장). */
export const PRICE: Record<FillingId, number> = {
  'red-bean': 1000,
  custard: 1000,
  'sweet-potato': 1200,
};

/** 등급별 팁(원). */
export const TIP: Record<ServedGrade, number> = { perfect: 300, good: 100, cold: 0 };

/** 반죽 하나 재료비(원). 보도된 원가 어림값(12장). 태우거나 버려도 나간다. */
export const COST: Record<FillingId, number> = {
  'red-bean': 220,
  custard: 250,
  'sweet-potato': 300,
};

/** 순이익 이만큼(원)이 1포인트다. */
export const WON_PER_POINT = 100;

export function salePrice(filling: FillingId, grade: ServedGrade, shop: ShopConfig): number {
  return PRICE[filling] + TIP[grade] + shop.priceBonus;
}

export function ingredientCost(filling: FillingId, shop: ShopConfig): number {
  return COST[filling] + shop.costBonus;
}

/** 한 판 매출·재료비로 번 포인트. 순이익이 0 미만이면 0. */
export function pointsFor(revenue: number, cost: number): number {
  return Math.floor(Math.max(0, revenue - cost) / WON_PER_POINT);
}

// --- 상점 (15.4) ---

export type UpgradeId = 'rack' | 'pans' | 'batter' | 'warmer';

export const UPGRADE_IDS = ['rack', 'pans', 'batter', 'warmer'] as const satisfies readonly UpgradeId[];

export type UpgradeLevels = Record<UpgradeId, number>;

type Upgrade = {
  label: string;
  emoji: string;
  /** 단계별 효과 설명. [0]은 기본 상태. */
  levels: readonly string[];
  /** 다음 단계로 가는 값. costs[n] = n단계 → n+1단계. */
  costs: readonly number[];
};

export const UPGRADES: Record<UpgradeId, Upgrade> = {
  rack: {
    label: '거치대 넓히기',
    emoji: '🧺',
    levels: ['거치대 3칸', '거치대 4칸', '거치대 5칸'],
    costs: [150, 300],
  },
  pans: {
    label: '틀 늘리기',
    emoji: '🍳',
    levels: ['틀 4칸', '틀 5칸', '틀 6칸'],
    costs: [200, 400],
  },
  batter: {
    label: '비싼 반죽',
    emoji: '🥚',
    levels: [
      '기본 반죽',
      '초록 구간 +10% · 판매가 +200원 · 재료비 +100원',
      '초록 구간 +20% · 판매가 +200원 · 재료비 +100원',
    ],
    costs: [250, 500],
  },
  warmer: {
    label: '보온 거치대',
    emoji: '🔥',
    levels: ['8초마다 식음', '11초마다 식음', '14초마다 식음'],
    costs: [150, 300],
  },
};

export const NO_UPGRADES: UpgradeLevels = { rack: 0, pans: 0, batter: 0, warmer: 0 };

export function maxLevel(id: UpgradeId): number {
  return UPGRADES[id].costs.length;
}

/** 다음 단계 값. 이미 끝 단계면 null. */
export function nextCost(id: UpgradeId, level: number): number | null {
  return UPGRADES[id].costs[level] ?? null;
}

/** 업그레이드 단계로 '내 가게' 설정을 만든다. */
export function shopConfig(levels: UpgradeLevels): ShopConfig {
  const batter = levels.batter > 0;
  return {
    pans: STANDARD_SHOP.pans + levels.pans,
    rackSlots: STANDARD_SHOP.rackSlots + levels.rack,
    greenWidthBonus: 0.1 * levels.batter,
    coolStepMs: STANDARD_SHOP.coolStepMs + 3000 * levels.warmer,
    priceBonus: batter ? 200 : 0,
    costBonus: batter ? 100 : 0,
  };
}

/** 가게 지갑. 포인트는 플레이로만 벌고, 실제 돈과는 무관하다(15.5). */
export type Wallet = {
  points: number;
  /** 지금까지 번 매출 합(원). 자랑용. */
  totalRevenue: number;
  upgrades: UpgradeLevels;
};

export const EMPTY_WALLET: Wallet = { points: 0, totalRevenue: 0, upgrades: NO_UPGRADES };

/** 한 판 벌이를 지갑에 더한다. */
export function earn(wallet: Wallet, revenue: number, cost: number): Wallet {
  return {
    ...wallet,
    points: wallet.points + pointsFor(revenue, cost),
    totalRevenue: wallet.totalRevenue + revenue,
  };
}

/** 업그레이드를 한 단계 산다. 포인트가 모자라거나 끝 단계면 null. */
export function purchase(wallet: Wallet, id: UpgradeId): Wallet | null {
  const level = wallet.upgrades[id];
  const cost = nextCost(id, level);
  if (cost === null || wallet.points < cost) {
    return null;
  }
  return {
    ...wallet,
    points: wallet.points - cost,
    upgrades: { ...wallet.upgrades, [id]: level + 1 },
  };
}
