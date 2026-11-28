import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { KanaAudio, PlayResult } from '../audio/player';
import { HIRAGANA_SEION, type KanaChar } from '../data/kana';
import { createProgressStore, STORE_KEY } from '../progress/store';
import { App } from './App';

/**
 * 가짜 재생기. `canPlay`는 미리 확인한 결과(기본은 `play` 결과와 같다).
 * 목소리 목록을 늦게 받아 미리 확인은 통과했는데 실제로는 못 내는 기기를 흉내 내려면 따로 준다.
 */
function fakeAudio(result: PlayResult = 'speech', canPlay = result !== 'unavailable') {
  const played: string[] = [];
  const audio: KanaAudio = {
    play(kana: KanaChar) {
      played.push(kana.char);
      return result;
    },
    canPlay: () => canPlay,
  };
  return { audio, played };
}

/** 2026-11-28 오전 10시(기기 시간대). */
const NOW = new Date(2026, 10, 28, 10, 0);

function renderApp(
  path = '/',
  result?: PlayResult,
  { canPlay, now = NOW }: { canPlay?: boolean; now?: Date } = {},
) {
  window.history.replaceState(null, '', path);
  const { audio, played } = fakeAudio(result, canPlay);
  const store = createProgressStore(window.localStorage);
  render(<App audio={audio} store={store} now={() => now} />);
  return { played, store };
}

function kanaByChar(char: string | null | undefined): KanaChar {
  const kana = HIRAGANA_SEION.find((item) => item.char === char);
  if (!kana) {
    throw new Error(`no kana ${char}`);
  }
  return kana;
}

/** 지금 문제(문자 보고 고르기)의 정답 문자. */
function promptKana(): KanaChar {
  return kanaByChar(document.querySelector('.quiz__kana')?.textContent);
}

function choices() {
  return within(screen.getByRole('list', { name: '보기' })).getAllByRole('button');
}

function live() {
  return document.querySelector('[aria-live="polite"]') as HTMLElement;
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

  it('goes back to the study tab when opened directly', () => {
    renderApp('/cards/row-ka');
    fireEvent.click(screen.getByRole('button', { name: /か행/ }));
    expect(window.location.pathname).toBe('/study');
    expect(screen.getByRole('heading', { name: '학습' })).toBeVisible();
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
    fireEvent.click(screen.getByRole('link', { name: /학습/ }));
    expect(window.location.pathname).toBe('/study');
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

describe('read quiz (문자 → 발음)', () => {
  function startRowQuiz(row: RegExp) {
    fireEvent.click(screen.getByRole('radio', { name: /보고 고르기/ }));
    fireEvent.click(screen.getByRole('button', { name: row }));
  }

  it('runs a row once with romaji choices and records reading mastery', () => {
    const { store, played } = renderApp('/study');
    startRowQuiz(/か행/);
    expect(window.location.pathname).toBe('/quiz/row-ka');
    expect(window.location.search).toMatch(/^\?shuffle=\d+$/);
    expect(screen.getByText('1 / 5')).toBeInTheDocument();

    const asked: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      const answer = promptKana();
      asked.push(answer.char);
      expect(choices()).toHaveLength(4);
      fireEvent.click(within(screen.getByRole('list', { name: '보기' })).getByRole('button', { name: answer.romaji }));
      expect(live()).toHaveTextContent(`정답! ${answer.char}, ${answer.romaji}`);
      // 답을 낸 그 클릭 안에서 정답 소리를 낸다.
      expect(played.at(-1)).toBe(answer.char);
      fireEvent.click(screen.getByRole('button', { name: step < 4 ? '다음 문제' : '결과 보기' }));
    }
    expect([...asked].sort()).toEqual(['か', 'き', 'く', 'け', 'こ'].sort());
    expect(screen.getByRole('heading', { name: '결과' })).toBeVisible();
    expect(screen.getByText('모두 맞혔어요! 🎉')).toBeVisible();
    expect(store.mastery().reading['hiragana-ka']).toEqual({ box: 2, due: '2026-11-29', recent: [1] });
  });

  it('marks a wrong answer, then offers to bookmark the missed character', () => {
    const { store } = renderApp('/study');
    startRowQuiz(/や행/);
    const answer = promptKana();
    const wrong = choices().find((button) => button.textContent !== answer.romaji) as HTMLElement;
    fireEvent.click(wrong);
    expect(live()).toHaveTextContent(`아쉬워요. 정답은 ${answer.char}, ${answer.romaji}`);
    expect(choices().every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByRole('button', { name: `${answer.romaji}, 정답` })).toBeInTheDocument();
    expect(store.mastery().reading[answer.id]).toMatchObject({ box: 1, due: '2026-11-28' });

    for (let step = 1; step < 3; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /다음 문제|결과 보기/ }));
      fireEvent.click(within(screen.getByRole('list', { name: '보기' })).getByRole('button', { name: promptKana().romaji }));
    }
    fireEvent.click(screen.getByRole('button', { name: '결과 보기' }));
    expect(document.querySelector('.quiz__score')).toHaveTextContent('2 / 3 맞혔어요');
    const missed = within(screen.getByRole('list', { name: '틀린 문자' })).getAllByRole('button');
    expect(missed).toHaveLength(1);
    expect(missed[0]).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: '☆ 틀린 문자 모두 담기' }));
    expect(store.bookmarks().has(answer.id)).toBe(true);
    expect(missed[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '★ 모두 담았어요' })).toBeDisabled();
  });

  it('remembers the chosen mode and choice style for next time', () => {
    const { store } = renderApp('/study');
    fireEvent.click(screen.getByRole('radio', { name: /보고 고르기/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^소리/ }));
    expect(store.settings()).toEqual({ studyMode: 'read', quizChoices: 'sound' });
    fireEvent.click(screen.getByRole('button', { name: /あ행/ }));
    expect(window.location.search).toMatch(/^\?choices=sound&shuffle=\d+$/);

    cleanupAndRender('/study', NOW);
    expect(screen.getByRole('radio', { name: /보고 고르기/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^소리/ })).toBeChecked();
  });

  it('caps the whole chart at ten questions', () => {
    renderApp('/quiz/seion?shuffle=5');
    expect(screen.getByText('1 / 10')).toBeInTheDocument();
  });

  it('quizzes only the bookmarked characters from 내 문자', () => {
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ version: 1, bookmarks: ['hiragana-nu', 'hiragana-me'] }),
    );
    renderApp('/mine');
    fireEvent.click(screen.getByRole('button', { name: '퀴즈 풀기' }));
    expect(window.location.pathname).toBe('/quiz/mine');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(['ぬ', 'め']).toContain(promptKana().char);
  });
});

describe('sound choices', () => {
  it('plays a choice on tap and answers only with 이걸로', () => {
    const { played } = renderApp('/quiz/row-a?choices=sound&shuffle=3');
    const answer = promptKana();
    const buttons = choices();
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      '보기 1 듣기', '보기 2 듣기', '보기 3 듣기', '보기 4 듣기',
    ]);
    // 보기에 로마자가 보이지 않는다.
    expect(buttons.some((button) => button.textContent?.includes(answer.romaji))).toBe(false);
    const confirm = screen.getByRole('button', { name: '이걸로' });
    expect(confirm).toBeDisabled();

    fireEvent.click(buttons[0] as HTMLElement);
    expect(played).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(confirm).toBeEnabled();
    expect(live()).toBeEmptyDOMElement();

    fireEvent.click(confirm);
    expect(live()).toHaveTextContent(/정답|아쉬워요/);
    expect(played.at(-1)).toBe(answer.char);
  });

  it('switches to romaji choices when the device turns out to have no voice', () => {
    renderApp('/quiz/row-a?choices=sound&shuffle=3', 'unavailable', { canPlay: true });
    fireEvent.click(choices()[0] as HTMLElement);
    expect(live()).toHaveTextContent('로마자 보기로 바꿨어요');
    expect(choices().map((button) => button.textContent)).toContain(promptKana().romaji);
  });
});

describe('listen quiz (소리 → 문자)', () => {
  it('waits for ▶ 듣기 before playing anything, then plays each next question on tap', () => {
    const { played, store } = renderApp('/study');
    fireEvent.click(screen.getByRole('radio', { name: /듣고 고르기/ }));
    fireEvent.click(screen.getByRole('button', { name: /さ행/ }));
    expect(window.location.search).toMatch(/^\?mode=listen&shuffle=\d+$/);

    // 화면이 뜨기만 해서는 소리가 나지 않는다(iOS는 터치 밖 재생을 막는다).
    expect(played).toEqual([]);
    expect(choices().every((button) => (button as HTMLButtonElement).disabled)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /듣기/ }));
    expect(played).toHaveLength(1);
    const first = kanaByChar(played[0]);
    expect(screen.getByRole('button', { name: /다시 듣기/ })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('list', { name: '보기' })).getByRole('button', { name: first.char }));
    expect(live()).toHaveTextContent(`정답! ${first.char}`);
    expect(store.mastery().reading[first.id]?.box).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: '다음 문제' }));
    // "다음 문제" 클릭 안에서 바로 다음 소리를 낸다.
    expect(played).toHaveLength(2);
    expect(choices().every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('offers to switch to the read quiz on a device without a Japanese voice', () => {
    renderApp('/quiz/row-a?mode=listen&shuffle=2', 'unavailable');
    expect(screen.getByText(/듣고 고르기를 할 수 없어요/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '보고 고르기로 바꾸기' }));
    expect(window.location.search).toBe('?shuffle=2');
    expect(choices().map((button) => button.textContent)).toContain(promptKana().romaji);
  });

  it('falls back the same way when ▶ 듣기 finds no voice', () => {
    renderApp('/quiz/row-a?mode=listen&shuffle=2', 'unavailable', { canPlay: true });
    fireEvent.click(screen.getByRole('button', { name: /듣기/ }));
    expect(screen.getByRole('button', { name: '보고 고르기로 바꾸기' })).toBeVisible();
  });

  it('disables sound-only options up front when the device has no voice', () => {
    renderApp('/study', 'unavailable');
    expect(screen.getByRole('radio', { name: /듣고 고르기/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /보고 고르기/ }));
    expect(screen.getByRole('radio', { name: /^소리/ })).toBeDisabled();
    expect(screen.getByText(/소리 보기: 이 기기에서는/)).toBeVisible();
  });
});

describe('mastery', () => {
  const saved = (reading: Record<string, unknown>) =>
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ version: 2, bookmarks: [], mastery: { reading, writing: {} } }),
    );

  it('colours the chart by reading level', () => {
    saved({ 'hiragana-ka': { box: 3, due: '2026-12-01', recent: [1] } });
    renderApp('/');
    const cell = document.querySelector('[data-kana-id="hiragana-ka"]') as HTMLElement;
    expect(cell).toHaveAttribute('data-level', '3');
    expect(cell).toHaveTextContent('숙련도 3단계');
    expect(document.querySelector('[data-kana-id="hiragana-ki"]')).not.toHaveAttribute('data-level');
    expect(screen.getByRole('list', { name: '숙련도 색' })).toBeVisible();
  });

  it('lists 복습할 문자 by the injected date and 약한 문자 by recent misses', () => {
    saved({
      'hiragana-ka': { box: 3, due: '2026-12-01', recent: [1, 1] },
      'hiragana-ro': { box: 1, due: '2026-11-28', recent: [0] },
    });
    renderApp('/study', undefined, { now: new Date(2026, 11, 1, 8, 0) });
    expect(screen.getByRole('button', { name: /복습할 문자/ })).toHaveTextContent('2자');
    expect(screen.getByRole('button', { name: /약한 문자/ })).toHaveTextContent('1자');
    cleanupAndRender('/study', new Date(2026, 10, 28, 8, 0));
    expect(screen.getByRole('button', { name: /복습할 문자/ })).toHaveTextContent('1자');
  });

  it('starts a quiz from 복습할 문자', () => {
    saved({ 'hiragana-ro': { box: 1, due: '2026-11-28', recent: [0] } });
    renderApp('/study');
    fireEvent.click(screen.getByRole('radio', { name: /보고 고르기/ }));
    fireEvent.click(screen.getByRole('button', { name: /복습할 문자/ }));
    expect(window.location.pathname).toBe('/quiz/review');
    expect(promptKana().char).toBe('ろ');
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });
});

function cleanupAndRender(path: string, now: Date) {
  cleanup();
  renderApp(path, undefined, { now });
}
