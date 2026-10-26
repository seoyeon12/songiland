import { simulateToEnd, startRun } from '../engine';
import { createRunStore, isRunState, PAST_LIVES_LIMIT } from './storage';

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

describe('createRunStore', () => {
  it('saves and loads a run in browser storage', () => {
    const storage = memoryStorage();
    const store = createRunStore(storage);
    const run = startRun({ seed: 3, name: '보리' });
    expect(store.persistence).toBe('local');
    store.save(run);
    expect(createRunStore(storage).load()).toEqual(run);
    store.clear();
    expect(createRunStore(storage).load()).toBeNull();
  });

  it('ignores broken or old data', () => {
    const storage = memoryStorage();
    storage.setItem('songiland:gyeonsaeng:run', '{"version":0}');
    expect(createRunStore(storage).load()).toBeNull();
    storage.setItem('songiland:gyeonsaeng:run', 'not json');
    expect(createRunStore(storage).load()).toBeNull();
  });

  it('keeps the run in memory when storage is blocked', () => {
    const store = createRunStore(blocked);
    expect(store.persistence).toBe('memory');
    const run = startRun({ seed: 3, name: '보리' });
    store.save(run);
    expect(store.load()).toEqual(run);
  });
});

describe('past lives', () => {
  const ended = (seed: number) => simulateToEnd(startRun({ seed, name: `보리${seed}` }));

  it('keeps finished runs newest first and replaces the same run', () => {
    const storage = memoryStorage();
    const store = createRunStore(storage);
    store.remember(ended(1), 100);
    store.remember(ended(2), 200);
    store.remember(ended(1), 300);
    const lives = createRunStore(storage).pastLives();
    expect(lives.map((life) => [life.run.seed, life.endedAt])).toEqual([
      [1, 300],
      [2, 200],
    ]);
  });

  it(`keeps only the latest ${PAST_LIVES_LIMIT}`, () => {
    const store = createRunStore(memoryStorage());
    const run = ended(1);
    for (let seed = 1; seed <= PAST_LIVES_LIMIT + 2; seed += 1) {
      store.remember({ ...run, seed }, seed);
    }
    const lives = store.pastLives();
    expect(lives).toHaveLength(PAST_LIVES_LIMIT);
    expect(lives[0].run.seed).toBe(PAST_LIVES_LIMIT + 2);
  });

  it('drops the oldest lives when storage is nearly full', () => {
    const storage = memoryStorage();
    const store = createRunStore(storage);
    const run = ended(1);
    store.remember({ ...run, seed: 1 }, 1);
    store.remember({ ...run, seed: 2 }, 2);
    const setItem = storage.setItem;
    // 견생 한 편만 들어갈 자리가 남았다.
    const room = JSON.stringify([{ endedAt: 3, run }]).length + 10;
    storage.setItem = (key, value) => {
      if (value.length > room) {
        throw new Error('QuotaExceededError');
      }
      setItem(key, value);
    };
    store.remember({ ...run, seed: 3 }, 3);
    expect(store.pastLives().map((life) => life.run.seed)).toEqual([3]);
  });

  it('ignores broken entries and unfinished runs', () => {
    const storage = memoryStorage();
    const running = startRun({ seed: 9, name: '콩' });
    storage.setItem(
      'songiland:gyeonsaeng:lives',
      JSON.stringify([{ endedAt: 1, run: running }, { endedAt: 2 }, { endedAt: 3, run: ended(4) }]),
    );
    expect(createRunStore(storage).pastLives().map((life) => life.endedAt)).toEqual([3]);
    storage.setItem('songiland:gyeonsaeng:lives', 'not json');
    expect(createRunStore(storage).pastLives()).toEqual([]);
  });

  it('remembers lives in memory when storage is blocked', () => {
    const store = createRunStore(blocked);
    store.remember(ended(5), 1);
    expect(store.pastLives()).toHaveLength(1);
  });
});

it('recognizes running and ended runs', () => {
  const run = startRun({ seed: 4, name: '보리' });
  expect(isRunState(run)).toBe(true);
  expect(isRunState(simulateToEnd(run))).toBe(true);
  expect(isRunState(null)).toBe(false);
  expect(isRunState({ ...run, dogs: [] })).toBe(false);
});
