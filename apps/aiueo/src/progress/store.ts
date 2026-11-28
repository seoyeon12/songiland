import {
  applyAnswer,
  DAY_KEY_PATTERN,
  EMPTY_MASTERY,
  MAX_BOX,
  RECENT_LIMIT,
  SKILLS,
  type MasteryBook,
  type MasteryRecord,
  type Skill,
} from './mastery';

/**
 * 학습 기록 저장소. 이 브라우저의 localStorage에 버전 붙은 JSON 하나로 저장하고 서버로 보내지 않는다.
 *
 * - version 1(1단계): 북마크만.
 * - version 2(2단계): 북마크 + 숙련도(읽기·쓰기 따로) + 설정.
 *
 * 저장 칸 이름(`STORE_KEY`)은 1단계 그대로 두고, 안의 `version`으로 형식을 가린다. 예전 형식은
 * 읽을 때 `migrate`로 올리고, 다음에 저장할 때 새 형식으로 덮어쓴다. 그래서 1단계에서 담은 북마크가
 * 그대로 이어진다.
 */
export const STORE_KEY = 'songiland:aiueo:v1';
const PROBE_KEY = 'songiland:aiueo:probe';

/** 학습 탭에서 고른 방식. 카드 넘기기, 문자 보고 발음 고르기, 소리 듣고 문자 고르기. */
export type StudyMode = 'cards' | 'read' | 'listen';

/** 문자→발음 퀴즈의 보기 표기. 로마자 글자 또는 표기 없는 소리 버튼. */
export type ChoiceStyle = 'romaji' | 'sound';

export type Settings = {
  /** 학습 탭에서 마지막으로 고른 방식. 퀴즈를 마치고 돌아와도 그대로다. */
  studyMode: StudyMode;
  /** 문자→발음 퀴즈 보기 표기. 퀴즈 시작 화면에서 고르고 다음에도 그대로 쓴다. */
  quizChoices: ChoiceStyle;
};

export const DEFAULT_SETTINGS: Settings = { studyMode: 'cards', quizChoices: 'romaji' };

export type SavedState = {
  version: 2;
  /** 북마크한 문자 id. 담은 순서대로 둔다. */
  bookmarks: string[];
  mastery: MasteryBook;
  settings: Settings;
};

/** 1단계가 남긴 형식. */
export type SavedStateV1 = {
  version: 1;
  bookmarks: string[];
};

const EMPTY: SavedState = {
  version: 2,
  bookmarks: [],
  mastery: EMPTY_MASTERY,
  settings: DEFAULT_SETTINGS,
};

/** 문자 id 형식(`hiragana-ka`). 다른 앱 버전이 남긴 모르는 id도 형식만 맞으면 지우지 않는다. */
const ID_PATTERN = /^[a-z]+-[a-z]+$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBookmarks(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const valid = value.filter((id): id is string => typeof id === 'string' && ID_PATTERN.test(id));
  return [...new Set(valid)];
}

function parseRecord(value: unknown): MasteryRecord | null {
  if (!isObject(value)) {
    return null;
  }
  const { box, due, recent } = value;
  if (
    typeof box !== 'number' ||
    !Number.isInteger(box) ||
    box < 1 ||
    box > MAX_BOX ||
    typeof due !== 'string' ||
    !DAY_KEY_PATTERN.test(due) ||
    !Array.isArray(recent)
  ) {
    return null;
  }
  const answers = recent.filter((answer): answer is 0 | 1 => answer === 0 || answer === 1);
  return { box, due, recent: answers.slice(-RECENT_LIMIT) };
}

function parseMastery(value: unknown): MasteryBook {
  if (!isObject(value)) {
    return EMPTY_MASTERY;
  }
  const book = { reading: {}, writing: {} } as Record<Skill, Record<string, MasteryRecord>>;
  for (const skill of SKILLS) {
    const map = value[skill];
    if (!isObject(map)) {
      continue;
    }
    for (const [id, raw] of Object.entries(map)) {
      const record = ID_PATTERN.test(id) ? parseRecord(raw) : null;
      if (record) {
        book[skill][id] = record;
      }
    }
  }
  return book;
}

function parseSettings(value: unknown): Settings {
  if (!isObject(value)) {
    return DEFAULT_SETTINGS;
  }
  const { studyMode, quizChoices } = value;
  return {
    studyMode:
      studyMode === 'cards' || studyMode === 'read' || studyMode === 'listen'
        ? studyMode
        : DEFAULT_SETTINGS.studyMode,
    quizChoices:
      quizChoices === 'romaji' || quizChoices === 'sound'
        ? quizChoices
        : DEFAULT_SETTINGS.quizChoices,
  };
}

/** version 1 → 2. 북마크는 그대로, 숙련도는 빈 기록, 설정은 기본값으로 시작한다. */
export function migrate(saved: SavedStateV1): SavedState {
  return { ...EMPTY, bookmarks: [...saved.bookmarks] };
}

/** 저장된 문자열을 읽는다. 예전 형식은 지금 형식으로 올리고, 깨졌거나 모르는 버전이면 빈 기록이다. */
export function parseSaved(raw: string | null): SavedState {
  if (!raw) {
    return EMPTY;
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!isObject(data)) {
    return EMPTY;
  }
  const bookmarks = parseBookmarks(data.bookmarks);
  if (!bookmarks) {
    return EMPTY;
  }
  if (data.version === 1) {
    return migrate({ version: 1, bookmarks });
  }
  if (data.version === 2) {
    return {
      version: 2,
      bookmarks,
      mastery: parseMastery(data.mastery),
      settings: parseSettings(data.settings),
    };
  }
  return EMPTY;
}

export interface ProgressStore {
  /** 저장이 막힌 환경(시크릿 모드 등)이면 `memory` — 새로 고치면 사라진다. */
  readonly persistence: 'local' | 'memory';
  /** 북마크한 id 집합. 바뀔 때마다 새 객체라 React가 변화를 알아챈다. */
  bookmarks(): ReadonlySet<string>;
  toggleBookmark(id: string): void;
  /** 기술별 숙련도. 바뀔 때마다 새 객체다. */
  mastery(): MasteryBook;
  /** 답 하나를 숙련도에 반영한다. `now`는 화면이 넣는다(테스트는 고정 시각). */
  recordAnswer(skill: Skill, id: string, correct: boolean, now: Date): void;
  settings(): Settings;
  updateSettings(patch: Partial<Settings>): void;
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
    if (next.bookmarks !== state.bookmarks) {
      bookmarkSet = new Set(next.bookmarks);
    }
    state = next;
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
    mastery: () => state.mastery,
    recordAnswer(skill, id, correct, now) {
      const map = state.mastery[skill];
      const record = applyAnswer(map[id], correct, now);
      commit({ ...state, mastery: { ...state.mastery, [skill]: { ...map, [id]: record } } });
    },
    settings: () => state.settings,
    updateSettings(patch) {
      commit({ ...state, settings: { ...state.settings, ...patch } });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
