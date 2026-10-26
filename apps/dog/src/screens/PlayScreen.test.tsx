import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, vi } from 'vitest';
import {
  advanceMonth,
  advanceUntilChoice,
  autoChoose,
  MS_PER_MONTH,
  startRun,
  welcome,
  type RunState,
} from '../engine';
import { runAwaitingNewcomer } from '../test/runs';
import { PlayScreen } from './PlayScreen';

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

function Harness({ initial }: { initial: RunState }) {
  const [run, setRun] = useState(initial);
  return (
    <>
      <PlayScreen run={run} onChange={(update) => setRun((current) => update(current))} />
      <output data-testid="month">{run.month}</output>
    </>
  );
}

/**
 * 첫날밤·배변 훈련 같은 초반 선택 카드를 모두 지나 보낸 뒤, 방금 선택이 있었던 것처럼
 * 만들어 몇 달 동안 선택 카드가 뜨지 않는 상태. 시계만 확인할 때 쓴다.
 */
function quietRun(): RunState {
  let run = startRun({ seed: 2, name: '보리' });
  while (run.month < 8 || run.pendingChoice) {
    run = run.pendingChoice ? autoChoose(run) : advanceMonth(run);
  }
  return { ...run, lastChoiceMonth: run.month, scheduled: [] };
}

function month(): number {
  return Number(screen.getByTestId('month').textContent);
}

it('advances one month every five seconds at normal speed and pauses', () => {
  vi.useFakeTimers();
  const quiet = quietRun();
  render(<Harness initial={quiet} />);
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH);
  });
  expect(month()).toBe(quiet.month + 1);

  fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH * 3);
  });
  expect(month()).toBe(quiet.month + 1);

  fireEvent.click(screen.getByRole('button', { name: '계속 보기' }));
  fireEvent.click(screen.getByLabelText('4배속'));
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH);
  });
  expect(month()).toBe(quiet.month + 5);
});

it('stops the clock on a choice card until a choice is made', () => {
  vi.useFakeTimers();
  const waiting = advanceUntilChoice(startRun({ seed: 12, name: '보리' }));
  render(<Harness initial={waiting} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent(waiting.pendingChoice!.text);
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH * 5);
  });
  expect(month()).toBe(waiting.month);

  fireEvent.click(screen.getByRole('button', { name: waiting.pendingChoice!.choices[0].label }));
  expect(screen.queryByRole('dialog')).toBeNull();
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH);
  });
  expect(month()).toBe(waiting.month + 1);
});

it('lets auto-decide choose after a short pause', () => {
  vi.useFakeTimers();
  const waiting = advanceUntilChoice(startRun({ seed: 12, name: '보리' }));
  render(<Harness initial={waiting} />);
  fireEvent.click(screen.getByLabelText('자동 결정'));
  expect(screen.getByText('자동 결정이 켜져 있어 곧 골라요.')).toBeVisible();
  act(() => {
    vi.advanceTimersByTime(3000);
  });
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('always asks for choices marked to be asked, even with auto-decide on', () => {
  vi.useFakeTimers();
  const waiting = advanceUntilChoice(startRun({ seed: 12, name: '보리' }));
  const askAlways = { ...waiting, pendingChoice: { ...waiting.pendingChoice!, alwaysAsk: true } };
  render(<Harness initial={askAlways} />);
  fireEvent.click(screen.getByLabelText('자동 결정'));
  act(() => {
    vi.advanceTimersByTime(10_000);
  });
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByText('이 선택은 자동 결정이 켜져 있어도 직접 정해요.')).toBeVisible();
});

it('pauses when the tab is hidden', () => {
  vi.useFakeTimers();
  const quiet = quietRun();
  render(<Harness initial={quiet} />);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  expect(screen.getByRole('button', { name: '계속 보기' })).toBeVisible();
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH * 2);
  });
  expect(month()).toBe(quiet.month);
});

it('asks to name a new family member and stops the clock until then', () => {
  vi.useFakeTimers();
  const waiting = runAwaitingNewcomer();
  const meeting = waiting.pendingMeeting!.meeting;
  render(<Harness initial={waiting} />);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent(meeting.intro[0]);
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH * 3);
  });
  expect(month()).toBe(waiting.month);

  fireEvent.change(screen.getByLabelText('이름을 지어 주세요'), { target: { value: '보리' } });
  expect(screen.getByText('가족 중에 같은 이름이 있어요.')).toBeVisible();
  expect(screen.getByRole('button', { name: /가족이 되기/ })).toBeDisabled();

  fireEvent.change(screen.getByLabelText('이름을 지어 주세요'), { target: { value: '두부' } });
  fireEvent.click(screen.getByRole('button', { name: '두부와 가족이 되기' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('group', { name: '우리 가족' })).toBeVisible();
  expect(screen.getByRole('button', { name: '두부' })).toHaveAttribute('aria-pressed', 'false');
});

it('names the newcomer with a suggestion when auto-decide is on, unless typing', () => {
  vi.useFakeTimers();
  const waiting = runAwaitingNewcomer();
  const suggested = waiting.pendingMeeting!.meeting.suggestedNames[0];
  window.localStorage.setItem('songiland:gyeonsaeng:pref:auto-decide', 'true');
  const { unmount } = render(<Harness initial={waiting} />);
  fireEvent.click(screen.getByRole('button', { name: suggested }));
  act(() => {
    vi.advanceTimersByTime(10_000);
  });
  expect(screen.getByRole('dialog')).toBeVisible();
  unmount();

  render(<Harness initial={waiting} />);
  expect(screen.getByText(/곧 추천 이름으로 정해요/)).toBeVisible();
  act(() => {
    vi.advanceTimersByTime(5000);
  });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: suggested })).toBeVisible();
});

it('switches between the dogs at home and shows how close they are', () => {
  const run = welcome(runAwaitingNewcomer(), '두부');
  render(<PlayScreen run={run} onChange={() => {}} />);
  expect(screen.getByRole('heading', { level: 1, name: '보리' })).toBeVisible();
  expect(screen.getByRole('meter', { name: '두부와 사이' })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: '두부' }));
  expect(screen.getByRole('heading', { level: 1, name: '두부' })).toBeVisible();
  expect(screen.getByRole('button', { name: '두부' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('meter', { name: '보리와 사이' })).toBeVisible();
});
