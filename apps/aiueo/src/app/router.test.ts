import { parseRoute, routeUrl, type Route } from './router';

describe('routes', () => {
  it('maps the three tabs to their paths', () => {
    expect(parseRoute('/', '')).toEqual({ screen: 'chart' });
    expect(parseRoute('/cards', '')).toEqual({ screen: 'cards' });
    expect(parseRoute('/mine/', '')).toEqual({ screen: 'mine' });
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
      { screen: 'cards' },
      { screen: 'mine' },
      { screen: 'deck', range: 'seion' },
      { screen: 'deck', range: 'row-wa', at: 'hiragana-wo', shuffle: 7, reveal: true },
    ];
    for (const route of routes) {
      const url = new URL(routeUrl(route), 'https://aiueo.arosys.kr');
      expect(parseRoute(url.pathname, url.search)).toEqual(route);
    }
  });
});
