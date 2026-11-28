import { useCallback, useEffect, useState } from 'react';
import type { ChoiceStyle } from '../progress/store';

/**
 * 화면 주소(라우터 라이브러리 없이 History API만 쓴다, 붕어빵과 같은 방식).
 *
 * - 하단 탭 화면: 문자표 `/`, 학습 `/study`, 내 문자 `/mine`. 탭끼리는 replace라 기록이 쌓이지 않는다.
 *   1단계의 카드 탭 주소 `/cards`는 학습 탭으로 연다.
 * - 카드 넘기기 `/cards/<범위>?at=<문자 id>&shuffle=<시드>&reveal=1`은 탭 위에 push한다.
 *   카드를 넘기면 `at`만 replace로 바꿔, 새로 고쳐도 보던 카드에서 다시 연다.
 *   뒤로가기는 언제나 한 번에 카드를 연 탭으로 돌아간다.
 * - 퀴즈 `/quiz/<범위>?mode=listen&choices=sound&shuffle=<시드>`도 탭 위에 push한다.
 *   `mode`가 없으면 문자 보고 발음 고르기, `choices`가 없으면 로마자 보기다. 문제 목록은 시드로
 *   정해지고, 푼 진도는 주소에 남기지 않는다(새로 고치면 같은 시드로 처음부터).
 */
export type Tab = 'chart' | 'study' | 'mine';

export type DeckRoute = {
  screen: 'deck';
  range: string;
  /** 지금 보는 카드의 문자 id. 없으면 첫 카드. */
  at?: string;
  /** 섞기 시드. 없으면 오십음도 순서. */
  shuffle?: number;
  /** 뒷면(발음)을 펼친 채로 연다. 문자표에서 글자를 눌러 들어올 때 쓴다. */
  reveal?: boolean;
};

/** 퀴즈 방향. `read`: 문자를 보고 발음 고르기, `listen`: 소리를 듣고 문자 고르기. */
export type QuizMode = 'read' | 'listen';

export type QuizRoute = {
  screen: 'quiz';
  range: string;
  mode: QuizMode;
  /** 문자→발음 퀴즈의 보기 표기. 듣고 고르기에서는 쓰지 않는다. */
  choices: ChoiceStyle;
  /** 섞기 시드. 없으면 고정 시드(주소로 바로 들어온 경우). */
  shuffle?: number;
};

export type Route = { screen: Tab } | DeckRoute | QuizRoute;

const TAB_PATHS: Record<Tab, string> = { chart: '/', study: '/study', mine: '/mine' };

/** 1단계에서 쓰던 주소. */
const LEGACY_TAB_PATHS: Record<string, Tab> = { '/cards': 'study' };

function readShuffle(params: URLSearchParams): number | undefined {
  const shuffle = Number(params.get('shuffle'));
  return Number.isInteger(shuffle) && shuffle > 0 ? shuffle : undefined;
}

export function parseRoute(pathname: string, search: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/';
  const tab = (Object.keys(TAB_PATHS) as Tab[]).find((key) => TAB_PATHS[key] === path);
  if (tab) {
    return { screen: tab };
  }
  const legacy = LEGACY_TAB_PATHS[path];
  if (legacy) {
    return { screen: legacy };
  }
  const params = new URLSearchParams(search);
  const quiz = /^\/quiz\/([a-z0-9-]+)$/.exec(path);
  if (quiz?.[1]) {
    const route: QuizRoute = {
      screen: 'quiz',
      range: quiz[1],
      mode: params.get('mode') === 'listen' ? 'listen' : 'read',
      choices: params.get('choices') === 'sound' ? 'sound' : 'romaji',
    };
    if (route.mode === 'listen') {
      route.choices = 'romaji';
    }
    const shuffle = readShuffle(params);
    if (shuffle) {
      route.shuffle = shuffle;
    }
    return route;
  }
  const deck = /^\/cards\/([a-z0-9-]+)$/.exec(path);
  if (!deck?.[1]) {
    return { screen: 'chart' };
  }
  const route: DeckRoute = { screen: 'deck', range: deck[1] };
  const at = params.get('at');
  if (at) {
    route.at = at;
  }
  const shuffle = readShuffle(params);
  if (shuffle) {
    route.shuffle = shuffle;
  }
  if (params.get('reveal') === '1') {
    route.reveal = true;
  }
  return route;
}

export function routeUrl(route: Route): string {
  if (route.screen === 'quiz') {
    return quizUrl(route);
  }
  if (route.screen !== 'deck') {
    return TAB_PATHS[route.screen];
  }
  const params = new URLSearchParams();
  if (route.at) {
    params.set('at', route.at);
  }
  if (route.shuffle) {
    params.set('shuffle', String(route.shuffle));
  }
  if (route.reveal) {
    params.set('reveal', '1');
  }
  const query = params.toString();
  return `/cards/${route.range}${query ? `?${query}` : ''}`;
}

function quizUrl(route: QuizRoute): string {
  const params = new URLSearchParams();
  if (route.mode === 'listen') {
    params.set('mode', 'listen');
  } else if (route.choices === 'sound') {
    params.set('choices', 'sound');
  }
  if (route.shuffle) {
    params.set('shuffle', String(route.shuffle));
  }
  const query = params.toString();
  return `/quiz/${route.range}${query ? `?${query}` : ''}`;
}

type HistoryEntry = { aiueo: true; depth: number };

function currentDepth(): number {
  const state = window.history.state as Partial<HistoryEntry> | null;
  return state?.aiueo && typeof state.depth === 'number' ? state.depth : 0;
}

function readLocation(): Route {
  return parseRoute(window.location.pathname, window.location.search);
}

export type Navigate = (route: Route, how?: 'push' | 'replace') => void;

/** 지금 화면과 화면 이동 함수. 뒤로가기·앞으로가기(popstate)를 따라간다. */
export function useRoute(): { route: Route; navigate: Navigate; back: (fallback: Route) => void } {
  const [route, setRoute] = useState<Route>(readLocation);

  useEffect(() => {
    const onPop = () => setRoute(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback<Navigate>((next, how = 'push') => {
    const depth = currentDepth();
    const entry: HistoryEntry = { aiueo: true, depth: how === 'push' ? depth + 1 : depth };
    if (how === 'push') {
      window.history.pushState(entry, '', routeUrl(next));
    } else {
      window.history.replaceState(entry, '', routeUrl(next));
    }
    setRoute(next);
  }, []);

  /** 이 앱이 쌓은 기록이 있으면 브라우저 뒤로가기, 주소로 바로 들어왔으면 `fallback`으로 바꾼다. */
  const back = useCallback(
    (fallback: Route) => {
      if (currentDepth() > 0) {
        window.history.back();
      } else {
        navigate(fallback, 'replace');
      }
    },
    [navigate],
  );

  return { route, navigate, back };
}
