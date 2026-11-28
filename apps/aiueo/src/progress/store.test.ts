import { createProgressStore, parseSaved, STORE_KEY } from './store';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe('parseSaved', () => {
  it('starts empty for missing, broken or unknown data', () => {
    for (const raw of [null, '', '{', '[]', '{"version":2,"bookmarks":[]}', '{"version":1}']) {
      expect(parseSaved(raw)).toEqual({ version: 1, bookmarks: [] });
    }
  });

  it('keeps well-formed ids once, in saved order', () => {
    const raw = JSON.stringify({
      version: 1,
      bookmarks: ['hiragana-ka', 3, 'hiragana-a', 'hiragana-ka', 'katakana-a', 'bad id'],
    });
    expect(parseSaved(raw).bookmarks).toEqual(['hiragana-ka', 'hiragana-a', 'katakana-a']);
  });
});

describe('progress store', () => {
  it('toggles bookmarks and saves them under the versioned key', () => {
    const storage = memoryStorage();
    const store = createProgressStore(storage);
    expect(store.persistence).toBe('local');
    store.toggleBookmark('hiragana-ka');
    store.toggleBookmark('hiragana-a');
    expect([...store.bookmarks()]).toEqual(['hiragana-ka', 'hiragana-a']);
    store.toggleBookmark('hiragana-ka');
    expect(JSON.parse(storage.getItem(STORE_KEY) ?? '')).toEqual({
      version: 1,
      bookmarks: ['hiragana-a'],
    });
  });

  it('reads bookmarks saved by an earlier visit', () => {
    const storage = memoryStorage({
      [STORE_KEY]: JSON.stringify({ version: 1, bookmarks: ['hiragana-n'] }),
    });
    expect(createProgressStore(storage).bookmarks().has('hiragana-n')).toBe(true);
  });

  it('notifies subscribers with a fresh set on every change', () => {
    const store = createProgressStore(memoryStorage());
    const before = store.bookmarks();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.toggleBookmark('hiragana-ka');
    expect(listener).toHaveBeenCalledOnce();
    expect(store.bookmarks()).not.toBe(before);
    unsubscribe();
    store.toggleBookmark('hiragana-ka');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('falls back to memory when storage refuses writes', () => {
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    const store = createProgressStore(storage);
    expect(store.persistence).toBe('memory');
    store.toggleBookmark('hiragana-ka');
    expect(store.bookmarks().has('hiragana-ka')).toBe(true);
  });

  it('works without any storage', () => {
    const store = createProgressStore(null);
    expect(store.persistence).toBe('memory');
    store.toggleBookmark('hiragana-a');
    expect(store.bookmarks().size).toBe(1);
  });
});
