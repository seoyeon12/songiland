import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { KanaAudio, PlayResult } from '../audio/player';
import type { KanaChar } from '../data/kana';
import { createProgressStore, STORE_KEY } from '../progress/store';
import { App } from './App';

function fakeAudio(result: PlayResult = 'speech') {
  const played: string[] = [];
  const audio: KanaAudio = {
    play(kana: KanaChar) {
      played.push(kana.char);
      return result;
    },
  };
  return { audio, played };
}

function renderApp(path = '/', result?: PlayResult) {
  window.history.replaceState(null, '', path);
  const { audio, played } = fakeAudio(result);
  const store = createProgressStore(window.localStorage);
  render(<App audio={audio} store={store} />);
  return { played, store };
}

function chartCell(id: string) {
  const cell = document.querySelector(`[data-kana-id="${id}"]`);
  if (!cell) {
    throw new Error(`no cell ${id}`);
  }
  return within(cell as HTMLElement).getByRole('button');
}

function card() {
  return screen.getByRole('button', { description: /카드를 눌러|다시 누르면/ });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('chart tab', () => {
  it('shows the app name, the portal link and the 46-character chart', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1, name: '아이우에오' })).toBeVisible();
    expect(screen.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
      'href',
      'http://localhost:5173/',
    );
    const chart = screen.getByRole('table', { name: '히라가나 청음 오십음도' });
    expect(chart.querySelectorAll('.chart__kana')).toHaveLength(46);
    expect(within(chart).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'a', 'i', 'u', 'e', 'o',
    ]);
  });

  it('keeps the empty gojūon slots as empty cells', () => {
    renderApp();
    const yaRow = screen.getByRole('row', { name: /や행/ });
    expect(within(yaRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'やya야', '', 'ゆyu유', '', 'よyo요',
    ]);
  });

  it('plays a character and opens its card showing the reading', () => {
    const { played } = renderApp();
    fireEvent.click(chartCell('hiragana-tsu'));
    expect(played).toEqual(['つ']);
    expect(window.location.pathname).toBe('/cards/seion');
    expect(window.location.search).toContain('at=hiragana-tsu');
    expect(card()).toHaveTextContent('つtsu츠');
    expect(screen.getByText('18 / 46')).toBeInTheDocument();
  });

  it('tells the learner when the device cannot make the sound', () => {
    renderApp('/', 'unavailable');
    fireEvent.click(chartCell('hiragana-a'));
    expect(screen.getByRole('status')).toHaveTextContent('이 기기에서는 아직 소리를 낼 수 없어요.');
  });
});

describe('cards', () => {
  it('flips a card to reveal and play the reading, then moves on face down', () => {
    const { played } = renderApp('/cards/row-ka');
    expect(card()).toHaveTextContent(/^か$/);
    fireEvent.click(card());
    expect(card()).toHaveTextContent('かka카');
    expect(played).toEqual(['か']);

    fireEvent.click(screen.getByRole('button', { name: '다음 카드' }));
    expect(card()).toHaveTextContent(/^き$/);
    expect(window.location.search).toBe('?at=hiragana-ki');
  });

  it('moves with the arrow keys and wraps from the last card', () => {
    renderApp('/cards/row-ya');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(card()).toHaveTextContent(/^よ$/);
    fireEvent.click(screen.getByRole('button', { name: '처음 카드로' }));
    expect(card()).toHaveTextContent(/^や$/);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(card()).toHaveTextContent(/^や$/);
  });

  it('swipes left to the next card without flipping', () => {
    renderApp('/cards/row-a');
    const stage = card().parentElement as HTMLElement;
    fireEvent.pointerDown(stage, { clientX: 200, clientY: 100 });
    fireEvent.pointerUp(stage, { clientX: 100, clientY: 110 });
    fireEvent.click(card());
    expect(card()).toHaveTextContent(/^い$/);
  });

  it('lets the learner pick a range from the cards tab', () => {
    renderApp('/cards');
    expect(screen.getByRole('button', { name: /내 문자/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /さ행/ }));
    expect(window.location.pathname).toBe('/cards/row-sa');
    expect(card()).toHaveTextContent(/^さ$/);
  });

  it('opens a shuffled deck with the seed in the address', () => {
    renderApp('/cards');
    fireEvent.click(screen.getByRole('checkbox', { name: '순서 섞기' }));
    fireEvent.click(screen.getByRole('button', { name: /히라가나 청음 전체/ }));
    expect(window.location.search).toMatch(/^\?shuffle=\d+$/);
  });

  it('goes back to the cards tab when opened directly', () => {
    renderApp('/cards/row-ka');
    fireEvent.click(screen.getByRole('button', { name: /か행/ }));
    expect(window.location.pathname).toBe('/cards');
    expect(screen.getByRole('heading', { name: '문자카드' })).toBeVisible();
  });
});

describe('bookmarks', () => {
  it('collects characters into 내 문자 and saves them', () => {
    const { store } = renderApp('/cards/row-ka');
    const bookmark = screen.getByRole('button', { name: '내 문자에 담기' });
    expect(bookmark).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(bookmark);
    expect(bookmark).toHaveAttribute('aria-pressed', 'true');
    expect(store.bookmarks().has('hiragana-ka')).toBe(true);
    expect(window.localStorage.getItem(STORE_KEY)).toContain('hiragana-ka');
  });

  it('marks bookmarked characters on the chart and lists them in 내 문자', () => {
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ version: 1, bookmarks: ['hiragana-nu', 'hiragana-me'] }),
    );
    const { played } = renderApp('/mine');
    expect(screen.getByRole('link', { name: '내 문자 2자' })).toHaveAttribute('aria-current', 'page');
    const list = screen.getByRole('list', { name: '담은 문자' });
    expect(within(list).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'ぬnu', 'めme',
    ]);

    fireEvent.click(within(list).getByRole('button', { name: /め/ }));
    expect(played).toEqual(['め']);
    expect(window.location.pathname).toBe('/cards/mine');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('keeps a card in the 내 문자 deck after un-bookmarking it mid-session', () => {
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ version: 1, bookmarks: ['hiragana-a', 'hiragana-i'] }),
    );
    renderApp('/cards/mine');
    fireEvent.click(screen.getByRole('button', { name: '내 문자에 담기' }));
    expect(card()).toHaveTextContent(/^あ$/);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('shows an empty state before anything is bookmarked', () => {
    renderApp('/mine');
    expect(screen.getByText(/누르면 여기에 모여요/)).toBeVisible();
    expect(screen.queryByRole('button', { name: '카드로 보기' })).toBeNull();
  });

  it('switches tabs without stacking history', () => {
    renderApp('/');
    const length = window.history.length;
    fireEvent.click(screen.getByRole('link', { name: /카드/ }));
    expect(window.location.pathname).toBe('/cards');
    expect(window.history.length).toBe(length);
  });
});

describe('notice', () => {
  it('hides the sound notice after a few seconds', () => {
    vi.useFakeTimers();
    renderApp('/', 'unavailable');
    fireEvent.click(chartCell('hiragana-a'));
    expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
