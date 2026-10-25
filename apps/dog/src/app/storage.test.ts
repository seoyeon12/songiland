import { simulateToEnd, startRun } from '../engine';
import { createRunStore, isRunState } from './storage';

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

it('recognizes running and ended runs', () => {
  const run = startRun({ seed: 4, name: '보리' });
  expect(isRunState(run)).toBe(true);
  expect(isRunState(simulateToEnd(run))).toBe(true);
  expect(isRunState(null)).toBe(false);
  expect(isRunState({ ...run, dogs: [] })).toBe(false);
});
