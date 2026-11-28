import { parseRoute, routeUrl, type Route } from './router';

describe('routes', () => {
  it('maps the three tabs to their paths', () => {
    expect(parseRoute('/', '')).toEqual({ screen: 'chart' });
    expect(parseRoute('/study', '')).toEqual({ screen: 'study' });
    expect(parseRoute('/mine/', '')).toEqual({ screen: 'mine' });
  });

  it('opens the old 카드 tab address as the 학습 tab', () => {
    expect(parseRoute('/cards', '')).toEqual({ screen: 'study' });
  });

  it('reads a quiz with its direction, choice style and seed', () => {
    expect(parseRoute('/quiz/mine', '?shuffle=9')).toEqual({
      screen: 'quiz',
      range: 'mine',
      mode: 'read',
      choices: 'romaji',
      shuffle: 9,
    });
    expect(parseRoute('/quiz/row-ka', '?choices=sound')).toMatchObject({ choices: 'sound' });
    // 듣고 고르기는 보기가 늘 문자라 보기 표기를 무시한다.
    expect(parseRoute('/quiz/weak', '?mode=listen&choices=sound')).toEqual({
      screen: 'quiz',
      range: 'weak',
      mode: 'listen',
      choices: 'romaji',
    });
  });

  it('reads a deck with its card, shuffle seed and reveal flag', () => {
    expect(parseRoute('/cards/row-ka', '?at=hiragana-ki&shuffle=42&reveal=1')).toEqual({
      screen: 'deck',
      range: 'row-ka',
      at: 'hiragana-ki',
      shuffle: 42,
      reveal: true,
    });
    expect(parseRoute('/cards/mine', '?shuffle=abc')).toEqual({ screen: 'deck', range: 'mine' });
  });

  it('sends unknown paths to the chart', () => {
    expect(parseRoute('/nope', '')).toEqual({ screen: 'chart' });
    expect(parseRoute('/cards/Bad_Range', '')).toEqual({ screen: 'chart' });
  });

  it('round-trips every route through its URL', () => {
    const routes: Route[] = [
      { screen: 'chart' },
      { screen: 'study' },
      { screen: 'mine' },
      { screen: 'deck', range: 'seion' },
      { screen: 'deck', range: 'row-wa', at: 'hiragana-wo', shuffle: 7, reveal: true },
      { screen: 'quiz', range: 'review', mode: 'read', choices: 'romaji' },
      { screen: 'quiz', range: 'mine', mode: 'read', choices: 'sound', shuffle: 3 },
      { screen: 'quiz', range: 'seion', mode: 'listen', choices: 'romaji', shuffle: 12 },
    ];
    for (const route of routes) {
      const url = new URL(routeUrl(route), 'https://aiueo.arosys.kr');
      expect(parseRoute(url.pathname, url.search)).toEqual(route);
    }
  });
});
