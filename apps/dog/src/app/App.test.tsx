import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { MS_PER_MONTH, previewMeeting, simulateToEnd, startRun } from '../engine';
import { runAboutToEnd } from '../test/runs';
import { App } from './App';
import { createRunStore } from './storage';

// jsdom에는 캔버스가 없어 공유 이미지는 가짜로 만든다.
vi.mock('../share/image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../share/image')>()),
  createShareImage: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  canShareImages: () => false,
}));

beforeEach(() => {
  // jsdom은 스크롤을 구현하지 않는다.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

/** 테스트마다 따로 쓰는 메모리 저장소. */
function memoryStore() {
  const data = new Map<string, string>();
  return createRunStore({
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  } as Storage);
}

it('goes from the start screen to meeting a dog and playing', () => {
  const meeting = previewMeeting(2026);
  render(<App store={memoryStore()} randomSeed={() => 2026} />);
  expect(screen.getByRole('heading', { name: '견생극장' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '만나러 가기' }));

  expect(screen.getByText(meeting.intro[0])).toBeVisible();
  fireEvent.change(screen.getByLabelText('이름을 지어 주세요'), { target: { value: '보리' } });
  fireEvent.click(screen.getByRole('button', { name: '보리와 가족이 되기' }));

  expect(screen.getByRole('heading', { name: '보리' })).toBeVisible();
  expect(screen.getByText('보리와 가족이 됐어요.')).toBeVisible();
});

it('uses a suggested name when none is typed', () => {
  const meeting = previewMeeting(77);
  render(<App store={memoryStore()} randomSeed={() => 77} />);
  fireEvent.click(screen.getByRole('button', { name: '만나러 가기' }));
  fireEvent.click(screen.getByRole('button', { name: meeting.suggestedNames[1] }));
  expect(
    screen.getByRole('button', { name: new RegExp(`^${meeting.suggestedNames[1]}(과|와) 가족이 되기$`) }),
  ).toBeVisible();
});

it('offers to resume a saved run', () => {
  const store = memoryStore();
  store.save(startRun({ seed: 5, name: '콩' }));
  render(<App store={store} randomSeed={() => 1} />);
  fireEvent.click(screen.getByRole('button', { name: '콩과의 견생 이어 보기' }));
  expect(screen.getByRole('heading', { name: '콩' })).toBeVisible();
});

it('does not offer to resume a finished run', () => {
  const store = memoryStore();
  store.save(simulateToEnd(startRun({ seed: 5, name: '콩' })));
  render(<App store={store} randomSeed={() => 1} />);
  expect(screen.queryByRole('button', { name: /이어 보기/ })).toBeNull();
  expect(screen.getByRole('button', { name: '만나러 가기' })).toBeVisible();
});

it('keeps a finished life in the past lives list', () => {
  vi.useFakeTimers();
  const store = memoryStore();
  store.save(runAboutToEnd(8, '콩'));
  render(<App store={store} randomSeed={() => 1} />);
  fireEvent.click(screen.getByRole('button', { name: '콩과의 견생 이어 보기' }));
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH);
  });

  expect(screen.getByRole('heading', { name: '콩의 견생' })).toBeVisible();
  expect(store.pastLives()).toHaveLength(1);
  expect(store.load()).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '한 번 더 상영하기' }));

  const list = screen.getByRole('region', { name: '지난 견생' });
  fireEvent.click(within(list).getByRole('button', { name: /^콩의 견생/ }));
  expect(screen.getByText(/^지난 상영작 · /)).toBeVisible();
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  fireEvent.click(screen.getByRole('button', { name: '목록으로 돌아가기' }));
  expect(screen.getByRole('button', { name: '만나러 가기' })).toBeVisible();
});

it('lists past lives newest first', () => {
  const store = memoryStore();
  store.remember(simulateToEnd(startRun({ seed: 1, name: '보리' })), 1);
  store.remember(simulateToEnd(startRun({ seed: 2, name: '두부' })), 2);
  render(<App store={store} randomSeed={() => 1} />);
  const items = within(screen.getByRole('region', { name: '지난 견생' })).getAllByRole('button');
  expect(items.map((item) => item.textContent)).toEqual([
    expect.stringMatching(/^두부의 견생/),
    expect.stringMatching(/^보리의 견생/),
  ]);
});
