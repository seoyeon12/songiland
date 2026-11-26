/** 문자 체계. 1차는 히라가나, 2차에 가타카나를 같은 구조로 붙인다. */
export type Script = 'hiragana' | 'katakana';

/** 학습 단원. 지금은 청음만 데이터가 있고, 탁음·반탁음·요음은 7단계에 채운다. */
export type KanaUnit = 'seion' | 'dakuon' | 'handakuon' | 'yoon';

/** 오십음도의 단(열). 표의 칸 순서이기도 하다. */
export const VOWELS = ['a', 'i', 'u', 'e', 'o'] as const;

export interface KanaChar {
  /**
   * 문자 하나의 고유 키. 음원 파일 이름, 북마크, 숙련도 기록이 이 값을 쓰므로
   * 한 번 정하면 바꾸지 않는다. 형식: `<script>-<로마자 키>` (예: `hiragana-ka`).
   */
  id: string;
  script: Script;
  unit: KanaUnit;
  /** 속한 행의 id (예: `ka`). */
  row: string;
  /** 오십음도에서의 칸 위치. `VOWELS`의 인덱스(0~4)다. */
  column: number;
  char: string;
  /** 헵번식 로마자. 발음 표기의 기본값이다. */
  romaji: string;
  /** 한글 근사 표기. 실제 소리와 다를 수 있는 참고용 보조 표기다. */
  hangul: string;
  /** 소리나 쓰임에서 초학자가 알아야 할 점. 카드 뒷면에 쓴다. */
  note?: string;
}

export interface KanaRow {
  id: string;
  /** 화면에 읽어 주는 행 이름 (예: `か행`). */
  label: string;
  /** 칸 5개. 오십음도에서 비어 있는 자리(や행의 i·e 등)는 `null`이다. */
  cells: ReadonlyArray<KanaChar | null>;
}

type CellSpec = {
  char: string;
  romaji: string;
  hangul: string;
  /** 로마자가 다른 문자와 겹칠 때 쓰는 id용 키 (を는 お와 같은 o라서 `wo`). */
  key?: string;
  note?: string;
};

function k(
  char: string,
  romaji: string,
  hangul: string,
  extra: Pick<CellSpec, 'key' | 'note'> = {},
): CellSpec {
  return { char, romaji, hangul, ...extra };
}

const _ = null;

/** 행 하나의 정의: 행 id와 a·i·u·e·o 순서의 칸 5개. */
type RowSpec = readonly [row: string, cells: ReadonlyArray<CellSpec | null>];

// 히라가나 청음 46자. 한 줄이 오십음도의 한 행이다.
const HIRAGANA_SEION_SPEC: readonly RowSpec[] = [
  [
    'a',
    [
      k('あ', 'a', '아'),
      k('い', 'i', '이'),
      k('う', 'u', '우', {
        note: '입술을 앞으로 내밀지 않고 가볍게 내는 "우"예요. "으"에 조금 가까워요.',
      }),
      k('え', 'e', '에'),
      k('お', 'o', '오'),
    ],
  ],
  ['ka', [k('か', 'ka', '카'), k('き', 'ki', '키'), k('く', 'ku', '쿠'), k('け', 'ke', '케'), k('こ', 'ko', '코')]],
  ['sa', [k('さ', 'sa', '사'), k('し', 'shi', '시'), k('す', 'su', '스'), k('せ', 'se', '세'), k('そ', 'so', '소')]],
  [
    'ta',
    [
      k('た', 'ta', '타'),
      k('ち', 'chi', '치'),
      k('つ', 'tsu', '츠', {
        note: '한국어에 없는 소리예요. 혀끝을 윗니 뒤에 댔다 떼며 "츠"와 "쯔" 사이로 내요.',
      }),
      k('て', 'te', '테'),
      k('と', 'to', '토'),
    ],
  ],
  ['na', [k('な', 'na', '나'), k('に', 'ni', '니'), k('ぬ', 'nu', '누'), k('ね', 'ne', '네'), k('の', 'no', '노')]],
  [
    'ha',
    [
      k('は', 'ha', '하', { note: '조사 "~은/는"으로 쓸 때는 wa(와)로 읽어요.' }),
      k('ひ', 'hi', '히'),
      k('ふ', 'fu', '후', {
        note: '윗니를 쓰지 않고 두 입술 사이로 바람을 내는 소리예요. f와 h의 중간쯤이에요.',
      }),
      k('へ', 'he', '헤', { note: '조사 "~에/로"로 쓸 때는 e(에)로 읽어요.' }),
      k('ほ', 'ho', '호'),
    ],
  ],
  ['ma', [k('ま', 'ma', '마'), k('み', 'mi', '미'), k('む', 'mu', '무'), k('め', 'me', '메'), k('も', 'mo', '모')]],
  ['ya', [k('や', 'ya', '야'), _, k('ゆ', 'yu', '유'), _, k('よ', 'yo', '요')]],
  [
    'ra',
    [
      k('ら', 'ra', '라', {
        note: '모음 사이의 한국어 "ㄹ"처럼 혀를 한 번 튕기는 소리예요. 영어 r과 달라요.',
      }),
      k('り', 'ri', '리'),
      k('る', 'ru', '루'),
      k('れ', 're', '레'),
      k('ろ', 'ro', '로'),
    ],
  ],
  [
    'wa',
    [
      k('わ', 'wa', '와'),
      _,
      _,
      _,
      k('を', 'o', '오', {
        key: 'wo',
        note: 'お와 같은 소리예요. 조사 "~을/를"로만 써요.',
      }),
    ],
  ],
  [
    'n',
    [
      k('ん', 'n', '응', {
        note: '혼자서는 낱말을 시작하지 않아요. 뒤에 오는 소리에 따라 받침 ㄴ·ㅁ·ㅇ처럼 바뀌어요.',
      }),
      _,
      _,
      _,
      _,
    ],
  ],
];

function buildRows(
  script: Script,
  unit: KanaUnit,
  spec: readonly RowSpec[],
): KanaRow[] {
  return spec.map(([row, cells]) => {
    const built = cells.map((cell, column): KanaChar | null =>
      cell === null
        ? null
        : {
            id: `${script}-${cell.key ?? cell.romaji}`,
            script,
            unit,
            row,
            column,
            char: cell.char,
            romaji: cell.romaji,
            hangul: cell.hangul,
            ...(cell.note === undefined ? {} : { note: cell.note }),
          },
    );
    const first = built.find((cell) => cell !== null);
    if (!first) {
      throw new Error(`빈 행입니다: ${row}`);
    }
    // ん은 행이라기보다 글자 하나라서 "행"을 붙이지 않는다.
    const label = row === 'n' ? first.char : `${first.char}행`;
    return { id: row, label, cells: built };
  });
}

/** 히라가나 청음 오십음도. 문자표 화면이 이 순서 그대로 그린다. */
export const HIRAGANA_SEION_ROWS: readonly KanaRow[] = buildRows(
  'hiragana',
  'seion',
  HIRAGANA_SEION_SPEC,
);

/** 히라가나 청음 46자를 오십음도 순서로 편 목록. */
export const HIRAGANA_SEION: readonly KanaChar[] = HIRAGANA_SEION_ROWS.flatMap(
  (row) => row.cells.filter((cell): cell is KanaChar => cell !== null),
);

const BY_ID = new Map(HIRAGANA_SEION.map((kana) => [kana.id, kana]));

/** id로 문자를 찾는다. 없는 id면 `undefined`. */
export function getKana(id: string): KanaChar | undefined {
  return BY_ID.get(id);
}
