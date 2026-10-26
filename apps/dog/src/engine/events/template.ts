import { josa, type JosaPair } from '../text/josa';

const PAIRS: readonly JosaPair[] = ['이/가', '은/는', '을/를', '과/와', '이에요/예요', '아/야', '이랑/랑'];

/**
 * 사건 문장의 자리표시를 채운다.
 * - {name} → 강아지 이름
 * - {name:이/가} → 받침에 맞춘 조사까지 붙인 이름
 * - {other}, {other:과/와} → 두 아이 사건의 짝 이름
 */
export function render(template: string, name: string, other?: string): string {
  return template.replace(
    /\{(name|other)(?::([^}]+))?\}/g,
    (_, who: 'name' | 'other', pair: string | undefined) => {
      const value = who === 'name' ? name : other;
      if (value === undefined) {
        throw new Error('짝이 없는 문장에는 {other}를 쓸 수 없습니다.');
      }
      if (!pair) {
        return value;
      }
      if (!PAIRS.includes(pair as JosaPair)) {
        throw new Error(`지원하지 않는 조사입니다: ${pair}`);
      }
      return josa(value, pair as JosaPair);
    },
  );
}
