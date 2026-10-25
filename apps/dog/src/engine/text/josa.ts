/**
 * 강아지 이름 뒤에 붙는 조사를 받침에 맞춰 고른다. 예: josa('보리', '이/가') → '보리가'.
 * 한글이 아닌 글자로 끝나면 받침이 없는 것으로 본다.
 */
export type JosaPair = '이/가' | '은/는' | '을/를' | '과/와' | '이에요/예요' | '아/야' | '이랑/랑';

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) {
    return false;
  }
  const code = last.charCodeAt(0);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) {
    return false;
  }
  return (code - HANGUL_FIRST) % 28 !== 0;
}

export function josa(word: string, pair: JosaPair): string {
  const [withFinal, withoutFinal] = pair.split('/');
  return word + (hasFinalConsonant(word) ? withFinal : withoutFinal);
}
