/**
 * 초학자가 모양을 헷갈리는 히라가나 묶음(기획서 6.4). 퀴즈 오답 보기를 여기서 먼저 뽑는다.
 * 문자 id(`hiragana-<키>`)의 키만 적는다. 한 문자가 여러 묶음에 들어갈 수 있다.
 */
const GROUPS: ReadonlyArray<readonly string[]> = [
  ['ha', 'ho'],
  ['ha', 'ke'],
  ['ne', 're', 'wa'],
  ['me', 'nu'],
  ['sa', 'ki', 'chi'],
  ['ru', 'ro'],
  ['i', 'ri'],
  ['a', 'o'],
  ['ma', 'mo'],
];

const BY_ID = new Map<string, Set<string>>();
for (const group of GROUPS) {
  for (const key of group) {
    const id = `hiragana-${key}`;
    const others = BY_ID.get(id) ?? new Set<string>();
    for (const other of group) {
      if (other !== key) {
        others.add(`hiragana-${other}`);
      }
    }
    BY_ID.set(id, others);
  }
}

/** `id`와 헷갈리는 문자 id들. 없으면 빈 집합. */
export function confusablesOf(id: string): ReadonlySet<string> {
  return BY_ID.get(id) ?? new Set();
}
