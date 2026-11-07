import '@testing-library/jest-dom/vitest';

/**
 * Node 24+는 전역 `localStorage`/`sessionStorage` 게터를 노출하는데, `--localstorage-file`
 * 없이는 undefined를 돌려주며 jsdom이 심어 둔 Storage를 가린다(Node 22 등에서는 없던 일).
 * 그래서 테스트에서 `window.localStorage`가 undefined가 된다. 정상 Storage가 없을 때만
 * 메모리 기반 Storage로 덮어써, Node 버전과 무관하게 테스트가 돌게 한다.
 */
function installMemoryStorage(key: 'localStorage' | 'sessionStorage'): void {
  let working = false;
  try {
    const existing = (globalThis as Record<string, unknown>)[key] as Storage | undefined;
    if (existing) {
      existing.setItem('__probe__', '1');
      existing.removeItem('__probe__');
      working = true;
    }
  } catch {
    working = false;
  }
  if (working) {
    return;
  }

  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(name) {
      return store.has(name) ? store.get(name)! : null;
    },
    key(index) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(name) {
      store.delete(name);
    },
    setItem(name, value) {
      store.set(name, String(value));
    },
  };
  Object.defineProperty(globalThis, key, { value: storage, configurable: true, writable: true });
}

installMemoryStorage('localStorage');
installMemoryStorage('sessionStorage');
