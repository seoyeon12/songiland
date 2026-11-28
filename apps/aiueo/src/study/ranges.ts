import { HIRAGANA_SEION, HIRAGANA_SEION_ROWS, type KanaChar } from '../data/kana';
import { isDue, isWeak, type MasteryMap } from '../progress/mastery';

/**
 * 학습 범위. 카드(그리고 다음 단계의 퀴즈·쓰기)가 모두 같은 범위를 쓴다(기획서 6장).
 * id는 화면 주소에 들어간다: `seion`, `row-ka`, `mine`, `review`, `weak`.
 */
export type StudyRange = {
  id: string;
  label: string;
  kana: readonly KanaChar[];
};

export const MINE_RANGE_ID = 'mine';
/** 복습일이 된 문자(읽기 숙련도). */
export const REVIEW_RANGE_ID = 'review';
/** 최근 오답률이 높은 문자(읽기 숙련도). */
export const WEAK_RANGE_ID = 'weak';
const SEION_RANGE_ID = 'seion';

/** ん은 혼자 한 행이라 카드가 한 장뿐이다. わ행에 붙여 "わ행·ん"으로 묶는다. */
const MERGED_INTO: Record<string, string> = { n: 'wa' };

function rowRanges(): StudyRange[] {
  const ranges = new Map<string, StudyRange>();
  for (const row of HIRAGANA_SEION_ROWS) {
    const kana = row.cells.filter((cell): cell is KanaChar => cell !== null);
    const target = MERGED_INTO[row.id];
    const merged = target ? ranges.get(`row-${target}`) : undefined;
    if (merged) {
      ranges.set(merged.id, {
        ...merged,
        label: `${merged.label}·${row.label}`,
        kana: [...merged.kana, ...kana],
      });
    } else {
      ranges.set(`row-${row.id}`, { id: `row-${row.id}`, label: row.label, kana });
    }
  }
  return [...ranges.values()];
}

const ROW_RANGES = rowRanges();

/** 고정 범위: 청음 전체와 행별. 범위 고르기 화면이 이 순서로 보여 준다. */
export const FIXED_RANGES: readonly StudyRange[] = [
  { id: SEION_RANGE_ID, label: '히라가나 청음 전체', kana: HIRAGANA_SEION },
  ...ROW_RANGES,
];

/** 북마크 id를 오십음도 순서의 문자로 바꾼다. 이 버전이 모르는 id(예: 나중 가타카나)는 뺀다. */
export function bookmarkedKana(bookmarks: ReadonlySet<string>): KanaChar[] {
  return HIRAGANA_SEION.filter((kana) => bookmarks.has(kana.id));
}

/** 숙련도로 정하는 범위에 필요한 것. `today`는 `YYYY-MM-DD`. */
export type StudyProgress = {
  mastery: MasteryMap;
  today: string;
};

/** 복습일이 된 문자를 오십음도 순서로. 풀어 본 적 없는 문자는 넣지 않는다. */
export function reviewKana({ mastery, today }: StudyProgress): KanaChar[] {
  return HIRAGANA_SEION.filter((kana) => {
    const record = mastery[kana.id];
    return record !== undefined && isDue(record, today);
  });
}

/** 최근 오답률이 높은 문자를 오십음도 순서로. */
export function weakKana({ mastery }: StudyProgress): KanaChar[] {
  return HIRAGANA_SEION.filter((kana) => {
    const record = mastery[kana.id];
    return record !== undefined && isWeak(record);
  });
}

const NO_PROGRESS: StudyProgress = { mastery: {}, today: '0000-00-00' };

/**
 * 범위 id를 문자 목록으로 푼다. 모르는 id면 `null`.
 * `progress`가 없으면 복습할·약한 문자는 빈 범위다.
 */
export function resolveRange(
  id: string,
  bookmarks: ReadonlySet<string>,
  progress: StudyProgress = NO_PROGRESS,
): StudyRange | null {
  if (id === MINE_RANGE_ID) {
    return { id, label: '내 문자', kana: bookmarkedKana(bookmarks) };
  }
  if (id === REVIEW_RANGE_ID) {
    return { id, label: '복습할 문자', kana: reviewKana(progress) };
  }
  if (id === WEAK_RANGE_ID) {
    return { id, label: '약한 문자', kana: weakKana(progress) };
  }
  return FIXED_RANGES.find((range) => range.id === id) ?? null;
}

/** 시드가 같으면 늘 같은 순서로 섞는다(mulberry32 + Fisher–Yates). 주소의 시드로 순서를 되살린다. */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  let a = seed >>> 0;
  const random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

/** 새 섞기 시드. 주소에 들어가므로 짧은 양의 정수로 만든다. */
export function newShuffleSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}
