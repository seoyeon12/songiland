import { createProgressStore, DEFAULT_SETTINGS, migrate, parseSaved, STORE_KEY } from './store';

const EMPTY_V2 = {
  version: 2,
  bookmarks: [],
  mastery: { reading: {}, writing: {} },
  settings: DEFAULT_SETTINGS,
};

const NOW = new Date(2026, 10, 28, 10, 0);

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
    for (const raw of [null, '', '{', '[]', '{"version":3,"bookmarks":[]}', '{"version":1}']) {
      expect(parseSaved(raw)).toEqual(EMPTY_V2);
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

describe('v1 → v2 migration', () => {
  it('keeps every v1 bookmark and starts mastery and settings fresh', () => {
    expect(migrate({ version: 1, bookmarks: ['hiragana-nu', 'hiragana-me'] })).toEqual({
      ...EMPTY_V2,
      bookmarks: ['hiragana-nu', 'hiragana-me'],
    });
  });

  it('reads a saved v1 document as v2', () => {
    const raw = JSON.stringify({ version: 1, bookmarks: ['hiragana-shi', 'hiragana-tsu'] });
    expect(parseSaved(raw)).toEqual({ ...EMPTY_V2, bookmarks: ['hiragana-shi', 'hiragana-tsu'] });
  });

  it('rewrites the v1 document as v2 on the next save without losing bookmarks', () => {
    const storage = memoryStorage({
      [STORE_KEY]: JSON.stringify({ version: 1, bookmarks: ['hiragana-ha', 'hiragana-ho'] }),
    });
    const store = createProgressStore(storage);
    expect([...store.bookmarks()]).toEqual(['hiragana-ha', 'hiragana-ho']);
    store.recordAnswer('reading', 'hiragana-ha', false, NOW);
    expect(JSON.parse(storage.getItem(STORE_KEY) ?? '')).toEqual({
      ...EMPTY_V2,
      bookmarks: ['hiragana-ha', 'hiragana-ho'],
      mastery: {
        reading: { 'hiragana-ha': { box: 1, due: '2026-11-28', recent: [0] } },
        writing: {},
      },
    });
    // 다시 열어도 그대로다.
    expect([...createProgressStore(storage).bookmarks()]).toEqual(['hiragana-ha', 'hiragana-ho']);
  });
});

describe('v2 documents', () => {
  it('keeps valid mastery records per skill and drops broken ones', () => {
    const raw = JSON.stringify({
      version: 2,
      bookmarks: [],
      mastery: {
        reading: {
          'hiragana-ka': { box: 3, due: '2026-12-01', recent: [1, 0, 1, 'x'] },
          'hiragana-ki': { box: 9, due: '2026-12-01', recent: [] },
          'hiragana-ku': { box: 2, due: 'tomorrow', recent: [] },
          'bad id': { box: 1, due: '2026-12-01', recent: [] },
        },
        writing: { 'hiragana-a': { box: 1, due: '2026-11-28', recent: [0] } },
        speaking: { 'hiragana-a': { box: 1, due: '2026-11-28', recent: [] } },
      },
      settings: { studyMode: 'listen', quizChoices: 'loud' },
    });
    expect(parseSaved(raw)).toEqual({
      version: 2,
      bookmarks: [],
      mastery: {
        reading: { 'hiragana-ka': { box: 3, due: '2026-12-01', recent: [1, 0, 1] } },
        writing: { 'hiragana-a': { box: 1, due: '2026-11-28', recent: [0] } },
      },
      settings: { studyMode: 'listen', quizChoices: 'romaji' },
    });
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
      ...EMPTY_V2,
      bookmarks: ['hiragana-a'],
    });
  });

  it('records reading answers and settings, notifying with fresh snapshots', () => {
    const storage = memoryStorage();
    const store = createProgressStore(storage);
    const bookmarks = store.bookmarks();
    const before = store.mastery();
    store.recordAnswer('reading', 'hiragana-ka', true, NOW);
    expect(store.mastery()).not.toBe(before);
    expect(store.mastery().reading['hiragana-ka']).toEqual({ box: 2, due: '2026-11-29', recent: [1] });
    expect(store.mastery().writing).toEqual({});
    // 숙련도만 바뀌면 북마크 집합은 그대로라 북마크를 쓰는 화면이 괜히 다시 그려지지 않는다.
    expect(store.bookmarks()).toBe(bookmarks);

    store.updateSettings({ quizChoices: 'sound' });
    expect(store.settings()).toEqual({ studyMode: 'cards', quizChoices: 'sound' });
    expect(createProgressStore(storage).settings().quizChoices).toBe('sound');
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
