/**
 * 화면 전환을 브라우저 방문 기록에 싣는다(라우터 라이브러리 없이 History API만 쓴다).
 *
 * 기록은 항상 "시작 화면 위에 화면 하나"로 유지한다: 시작에서 들어간 화면(상점·튜토리얼·장사)은
 * push, 그 화면에서 이어지는 화면(장사 → 결과, 결과 → 다시 도전, 튜토리얼 → 오늘의 장사)은
 * replace. 그래서 뒤로가기는 언제나 한 번에 시작 화면으로 돌아간다.
 *
 * 장사·결과 화면은 판 상태를 주소로 되살릴 수 없다. 앞으로가기나 새로고침으로 그 기록에
 * 닿으면 시작 화면으로 돌려보낸다.
 */
export type Screen = 'start' | 'shop' | 'tutorial' | 'play' | 'result';

export const SCREEN_PATHS: Record<Screen, string> = {
  start: '/',
  shop: '/shop',
  tutorial: '/tutorial',
  play: '/play',
  result: '/result',
};

/** 주소만으로 열 수 있는 화면(판 상태가 필요 없는 화면). */
export const RESTORABLE: ReadonlySet<Screen> = new Set(['start', 'shop', 'tutorial']);

export type Entry = { bbang: Screen; depth: number };

export function readEntry(state: unknown): Entry | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }
  const { bbang, depth } = state as Partial<Entry>;
  return bbang && bbang in SCREEN_PATHS && typeof depth === 'number' ? { bbang, depth } : null;
}

export function screenFromPath(pathname: string): Screen | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const found = (Object.keys(SCREEN_PATHS) as Screen[]).find((screen) => SCREEN_PATHS[screen] === path);
  return found ?? null;
}

/** 지금 기록 칸의 깊이(시작 화면 = 0). */
export function currentDepth(): number {
  return readEntry(window.history.state)?.depth ?? 0;
}

/** 새 화면을 기록에 싣는다. push는 한 칸 위로, replace는 지금 칸을 바꾼다. */
export function writeEntry(screen: Screen, how: 'push' | 'replace'): void {
  const depth = currentDepth();
  const entry: Entry = { bbang: screen, depth: how === 'push' ? depth + 1 : depth };
  const url = SCREEN_PATHS[screen] + window.location.search + window.location.hash;
  if (how === 'push') {
    window.history.pushState(entry, '', url);
  } else {
    window.history.replaceState(entry, '', url);
  }
}
