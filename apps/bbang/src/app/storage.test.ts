import { describe, expect, it } from 'vitest';
import { EMPTY_WALLET, NO_UPGRADES } from '../engine';
import { createBbangStore, DAILY_HISTORY_LIMIT } from './storage';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

const blocked = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

const entry = (day: string, score: number) => ({
  day,
  seed: 11,
  rules: 2,
  score,
  bestStreak: 3,
  inputs: [{ atMs: 100, input: { type: 'pour' as const, panIndex: 0 } }],
});

describe('createBbangStore', () => {
  it('keeps the best score per day and a ghost of that run', () => {
    const storage = memoryStorage();
    const store = createBbangStore(storage);
    expect(store.persistence).toBe('local');
    expect(store.recordDaily(entry('2026-11-08', 500), 1)).toEqual({ previousBest: null, isNewBest: true });
    expect(store.recordDaily(entry('2026-11-08', 400), 2)).toEqual({ previousBest: 500, isNewBest: false });
    expect(store.recordDaily(entry('2026-11-08', 800), 3)).toEqual({ previousBest: 500, isNewBest: true });

    const reopened = createBbangStore(storage);
    expect(reopened.dailyBest('2026-11-08')).toMatchObject({ score: 800, recordedAt: 3 });
    expect(reopened.ghost('2026-11-08', 2)?.score).toBe(800);
    expect(reopened.dailyBest('2026-11-09')).toBeNull();
    expect(reopened.ghost('2026-11-09', 2)).toBeNull(); // 다른 날의 고스트는 안 쓴다
    expect(reopened.ghost('2026-11-08', 3)).toBeNull(); // 규칙이 바뀌면 안 쓴다
  });

  it('does not let a tie replace the ghost', () => {
    const store = createBbangStore(memoryStorage());
    store.recordDaily(entry('2026-11-08', 500));
    expect(store.recordDaily({ ...entry('2026-11-08', 500), seed: 99 }).isNewBest).toBe(false);
    expect(store.ghost('2026-11-08', 2)?.seed).toBe(11);
  });

  it(`keeps only the latest ${DAILY_HISTORY_LIMIT} days`, () => {
    const store = createBbangStore(memoryStorage());
    for (let day = 1; day <= DAILY_HISTORY_LIMIT + 3; day += 1) {
      store.recordDaily(entry(`2026-01-${String(day).padStart(2, '0')}`, day));
    }
    expect(store.dailyBest('2026-01-01')).toBeNull();
    expect(store.dailyBest(`2026-01-${DAILY_HISTORY_LIMIT + 3}`)).not.toBeNull();
  });

  it('keeps a separate 내 가게 best', () => {
    const store = createBbangStore(memoryStorage());
    expect(store.ownBest()).toBeNull();
    store.recordOwn(300);
    expect(store.recordOwn(200)).toEqual({ previousBest: 300, isNewBest: false });
    expect(store.ownBest()).toBe(300);
    expect(store.dailyBest('2026-11-08')).toBeNull();
  });

  it('saves the wallet and sanitises a tampered one', () => {
    const storage = memoryStorage();
    const store = createBbangStore(storage);
    expect(store.wallet()).toEqual(EMPTY_WALLET);
    const wallet = { points: 120, totalRevenue: 30_000, upgrades: { ...NO_UPGRADES, pans: 1 } };
    store.saveWallet(wallet);
    expect(createBbangStore(storage).wallet()).toEqual(wallet);

    storage.setItem(
      'songiland:bbang:wallet:v1',
      JSON.stringify({ points: 50.7, upgrades: { rack: 99, pans: -1, batter: 'x' } }),
    );
    expect(createBbangStore(storage).wallet()).toEqual({
      points: 50,
      totalRevenue: 0,
      upgrades: { rack: 2, pans: 0, batter: 0, warmer: 0 },
    });
    storage.setItem('songiland:bbang:wallet:v1', 'not json');
    expect(createBbangStore(storage).wallet()).toEqual(EMPTY_WALLET);
  });

  it('ignores broken data', () => {
    const storage = memoryStorage();
    storage.setItem('songiland:bbang:best:v1', 'not json');
    storage.setItem('songiland:bbang:ghost:v1', '{"day":"2026-11-08"}');
    const store = createBbangStore(storage);
    expect(store.dailyBest('2026-11-08')).toBeNull();
    expect(store.ghost('2026-11-08', 2)).toBeNull();
  });

  it('falls back to memory when storage is blocked', () => {
    const store = createBbangStore(blocked);
    expect(store.persistence).toBe('memory');
    store.recordDaily(entry('2026-11-08', 500));
    expect(store.dailyBest('2026-11-08')?.score).toBe(500);
  });
});
