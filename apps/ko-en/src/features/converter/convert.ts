/**
 * 두벌식 자판 기준 한영타 변환.
 * - toHangul: 한글 자판인 줄 모르고 영문으로 친 글자(dkssud)를 한글(안녕)로 되돌린다.
 * - toLatin: 영문 자판인 줄 모르고 한글로 친 글자(안녕)를 영문(dkssud)으로 되돌린다.
 * 변환 대상이 아닌 글자(숫자, 기호, 공백, 다른 문자)는 그대로 둔다.
 */

// 유니코드 한글 음절 = 0xAC00 + (초성 × 21 + 중성) × 28 + 종성
const SYLLABLE_BASE = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ',
  'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/** 두벌식 자판: 영문 키 → 자모. Shift가 의미 있는 키만 대문자를 따로 둔다. */
const KEY_TO_JAMO: Record<string, string> = {
  q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ',
  a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ',
  z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ',
  Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ',
};

const JAMO_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_TO_JAMO).map(([key, jamo]) => [jamo, key]),
);

/** 두 키로 치는 겹모음·겹받침. 한→영에서는 나누고, 영→한에서는 합친다. */
const COMPOUND: Record<string, [string, string]> = {
  ㅘ: ['ㅗ', 'ㅏ'], ㅙ: ['ㅗ', 'ㅐ'], ㅚ: ['ㅗ', 'ㅣ'], ㅝ: ['ㅜ', 'ㅓ'],
  ㅞ: ['ㅜ', 'ㅔ'], ㅟ: ['ㅜ', 'ㅣ'], ㅢ: ['ㅡ', 'ㅣ'],
  ㄳ: ['ㄱ', 'ㅅ'], ㄵ: ['ㄴ', 'ㅈ'], ㄶ: ['ㄴ', 'ㅎ'], ㄺ: ['ㄹ', 'ㄱ'],
  ㄻ: ['ㄹ', 'ㅁ'], ㄼ: ['ㄹ', 'ㅂ'], ㄽ: ['ㄹ', 'ㅅ'], ㄾ: ['ㄹ', 'ㅌ'],
  ㄿ: ['ㄹ', 'ㅍ'], ㅀ: ['ㄹ', 'ㅎ'], ㅄ: ['ㅂ', 'ㅅ'],
};

const COMBINE: Record<string, string> = Object.fromEntries(
  Object.entries(COMPOUND).map(([whole, [first, second]]) => [first + second, whole]),
);

function isVowel(jamo: string): boolean {
  return JUNG.includes(jamo);
}

function isSyllable(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= SYLLABLE_BASE && code <= SYLLABLE_LAST;
}

/** 키 하나에 해당하는 자모. 대문자는 Shift 의미가 없으면 소문자로 본다(Caps Lock). */
function keyToJamo(char: string): string | undefined {
  return KEY_TO_JAMO[char] ?? KEY_TO_JAMO[char.toLowerCase()];
}

/** 영문 키 입력을 두벌식 오토마타로 한글 음절로 조합한다. */
export function toHangul(text: string): string {
  let out = '';
  let cho = '';
  let jung = '';
  let jong = '';

  function flush(): void {
    if (cho && jung) {
      const code =
        SYLLABLE_BASE +
        (CHO.indexOf(cho) * JUNG.length + JUNG.indexOf(jung)) * JONG.length +
        JONG.indexOf(jong);
      out += String.fromCharCode(code);
    } else {
      out += cho + jung;
    }
    cho = '';
    jung = '';
    jong = '';
  }

  for (const char of text) {
    const jamo = keyToJamo(char);
    if (!jamo) {
      flush();
      out += char;
      continue;
    }

    if (isVowel(jamo)) {
      if (cho && !jung) {
        jung = jamo;
      } else if (jong) {
        // 받침 뒤에 모음이 오면 받침(겹받침이면 뒷부분)이 다음 글자의 초성이 된다.
        const parts = COMPOUND[jong];
        const nextCho = parts ? parts[1] : jong;
        jong = parts ? parts[0] : '';
        flush();
        cho = nextCho;
        jung = jamo;
      } else if (jung && COMBINE[jung + jamo]) {
        jung = COMBINE[jung + jamo];
      } else {
        flush();
        jung = jamo;
      }
      continue;
    }

    // 자음
    if (cho && jung && !jong && JONG.includes(jamo)) {
      jong = jamo;
    } else if (jong && COMBINE[jong + jamo]) {
      jong = COMBINE[jong + jamo];
    } else {
      flush();
      cho = jamo;
    }
  }

  flush();
  return out;
}

function jamoToKeys(jamo: string): string {
  const parts = COMPOUND[jamo];
  if (parts) {
    return parts.map((part) => JAMO_TO_KEY[part]).join('');
  }
  return JAMO_TO_KEY[jamo] ?? jamo;
}

/** 한글 음절과 자모를 두벌식 자판의 영문 키로 되돌린다. */
export function toLatin(text: string): string {
  let out = '';
  for (const char of text) {
    if (isSyllable(char)) {
      const offset = char.charCodeAt(0) - SYLLABLE_BASE;
      const jong = offset % JONG.length;
      const jung = Math.floor(offset / JONG.length) % JUNG.length;
      const cho = Math.floor(offset / (JONG.length * JUNG.length));
      out += jamoToKeys(CHO[cho]) + jamoToKeys(JUNG[jung]) + jamoToKeys(JONG[jong]);
    } else {
      out += jamoToKeys(char);
    }
  }
  return out;
}

export type Direction = 'toHangul' | 'toLatin';

/**
 * 어느 쪽으로 바꿀지 추측한다. 한글(음절·자모)이 영문 글자보다 많으면 한→영,
 * 아니면 영→한이다.
 */
export function detectDirection(text: string): Direction {
  let hangul = 0;
  let latin = 0;
  for (const char of text) {
    if (isSyllable(char) || JAMO_TO_KEY[char] || COMPOUND[char]) {
      hangul += 1;
    } else if (/[a-z]/i.test(char)) {
      latin += 1;
    }
  }
  return hangul > latin ? 'toLatin' : 'toHangul';
}

export function convert(text: string, direction: Direction): string {
  return direction === 'toHangul' ? toHangul(text) : toLatin(text);
}
