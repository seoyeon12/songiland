/**
 * 학습 기록 저장소. 이 브라우저의 localStorage에 버전 붙은 JSON 하나로 저장하고 서버로 보내지 않는다.
 * 1단계는 북마크("내 문자")만 담는다. 숙련도·설정은 다음 단계에서 같은 문서에 더한다.
 */
export const STORE_KEY = 'songiland:aiueo:v1';
const PROBE_KEY = 'songiland:aiueo:probe';

export type SavedState = {
  version: 1;
  /** 북마크한 문자 id. 담은 순서대로 둔다. */
  bookmarks: string[];
};

const EMPTY: SavedState = { version: 1, bookmarks: [] };

/** 문자 id 형식(`hiragana-ka`). 다른 앱 버전이 남긴 모르는 id도 형식만 맞으면 지우지 않는다. */
const ID_PATTERN = /^[a-z]+-[a-z]+$/;

/** 저장된 문자열을 읽는다. 깨졌거나 모르는 버전이면 빈 기록으로 시작한다. */
export function parseSaved(raw: string | null): SavedState {
  if (!raw) {
    return EMPTY;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== 1) {
      return EMPTY;
    }
    const bookmarks = (data as { bookmarks?: unknown }).bookmarks;
    if (!Array.isArray(bookmarks)) {
      return EMPTY;
    }
    const valid = bookmarks.filter(
      (id): id is string => typeof id === 'string' && ID_PATTERN.test(id),
    );
    return { version: 1, bookmarks: [...new Set(valid)] };
  } catch {
    return EMPTY;
  }
}

export interface ProgressStore {
  /** 저장이 막힌 환경(시크릿 모드 등)이면 `memory` — 새로 고치면 사라진다. */
  readonly persistence: 'local' | 'memory';
  /** 북마크한 id 집합. 바뀔 때마다 새 객체라 React가 변화를 알아챈다. */
  bookmarks(): ReadonlySet<string>;
  toggleBookmark(id: string): void;
  subscribe(listener: () => void): () => void;
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function readRaw(storage: Storage): string | null {
  try {
    return storage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

/** 실제로 쓰고 지울 수 있는지 확인한다. 사파리 시크릿 모드 등은 쓰기에서 예외를 던진다. */
function usable(storage: Storage | null): storage is Storage {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** `storage`가 `null`이면 저장소 없이(메모리로만) 만든다. */
export function createProgressStore(
  storage: Storage | null = defaultStorage() ?? null,
): ProgressStore {
  // 쓸 수 있는 저장소일 때만 잡아 둔다. 없으면 이번 실행 동안 메모리에만 남는다.
  const target = usable(storage) ? storage : undefined;
  let state = target ? parseSaved(readRaw(target)) : EMPTY;
  let bookmarkSet: ReadonlySet<string> = new Set(state.bookmarks);
  const listeners = new Set<() => void>();

  function commit(next: SavedState) {
    state = next;
    bookmarkSet = new Set(next.bookmarks);
    try {
      target?.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // 용량 초과 등. 이번 실행 동안은 메모리에 남는다.
    }
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    persistence: target ? 'local' : 'memory',
    bookmarks: () => bookmarkSet,
    toggleBookmark(id) {
      const bookmarks = bookmarkSet.has(id)
        ? state.bookmarks.filter((saved) => saved !== id)
        : [...state.bookmarks, id];
      commit({ ...state, bookmarks });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
