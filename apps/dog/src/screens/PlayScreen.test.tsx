import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

it('rushes to the next choice card, then goes back to the chosen speed', () => {
  vi.useFakeTimers();
  const quiet = quietRun();
  const next = advanceUntilChoice(quiet);
  expect(next.pendingChoice).not.toBeNull();
  render(<Harness initial={quiet} />);
  const rush = screen.getByRole('button', { name: '다음 선택지까지' });
  fireEvent.click(rush);
  expect(rush).toHaveAttribute('aria-pressed', 'true');

  // 한 달에 0.1초씩 흘러 선택 카드가 뜨는 달에 멈춘다.
  act(() => {
    vi.advanceTimersByTime(100 * (next.month - quiet.month));
  });
  expect(month()).toBe(next.month);
  expect(screen.getByRole('dialog')).toHaveTextContent(next.pendingChoice!.text);

  // 이 판의 다음 선택은 새 식구 사건이라, 이름 짓기 카드가 뜨지 않게 들이지 않는 쪽을 고른다.
  fireEvent.click(screen.getByRole('button', { name: next.pendingChoice!.choices.at(-1)!.label }));
  expect(rush).toHaveAttribute('aria-pressed', 'false');
  act(() => {
    vi.advanceTimersByTime(MS_PER_MONTH - 1);
  });
  expect(month()).toBe(next.month);
  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(month()).toBe(next.month + 1);
});

it('starts rushing from a pause and stops when pressed again', () => {
  vi.useFakeTimers();
  const quiet = quietRun();
  render(<Harness initial={quiet} />);
  fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
  const rush = screen.getByRole('button', { name: '다음 선택지까지' });
  fireEvent.click(rush);
  expect(screen.getByRole('button', { name: '일시정지' })).toBeVisible();
  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(month()).toBe(quiet.month + 2);

  fireEvent.click(rush);
  expect(rush).toHaveAttribute('aria-pressed', 'false');
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(month()).toBe(quiet.month + 2);
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
  const siblings = screen.getByRole('list', { name: '함께 사는 동생들' });
  expect(within(siblings).getByRole('heading', { name: '두부' })).toBeVisible();
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
  const siblings = screen.getByRole('list', { name: '함께 사는 동생들' });
  expect(within(siblings).getByRole('heading', { name: suggested })).toBeVisible();
});

it('shows the other dogs in small cards under the first dog', () => {
  const run = welcome(runAwaitingNewcomer(), '두부');
  const { rerender } = render(<PlayScreen run={run} onChange={() => {}} />);
  expect(screen.getByRole('heading', { level: 1, name: '보리' })).toBeVisible();
  const card = within(screen.getByRole('list', { name: '함께 사는 동생들' })).getByRole('region', {
    name: '두부',
  });
  expect(within(card).getByRole('meter', { name: '두부 건강' })).toBeVisible();
  expect(within(card).getByRole('meter', { name: '두부 행복' })).toBeVisible();
  expect(within(card).getByRole('meter', { name: '두부, 보리와 사이' })).toBeVisible();

  // 먼저 떠난 동생은 흐리게 남고 막대는 없다.
  const [first, second] = run.dogs;
  rerender(
    <PlayScreen
      run={{ ...run, dogs: [first, { ...second, passedMonth: run.month }] }}
      onChange={() => {}}
    />,
  );
  const gone = screen.getByRole('region', { name: '두부' });
  expect(gone).toHaveTextContent('강아지별로 떠났어요');
  expect(within(gone).queryByRole('meter')).toBeNull();
});

it('names the dog a choice card is about when several dogs live together', () => {
  const run = welcome(runAwaitingNewcomer(), '두부');
  const [first, second] = run.dogs;
  const pending = {
    eventId: 'kid-greeting',
    dogId: second.id,
    month: run.month,
    tone: 'calm' as const,
    text: '산책길에서 만난 꼬마가 두부를 쓰다듬어 봐도 되냐고 물어요.',
    choices: [{ id: 'sniff-first', label: '손 냄새부터 천천히 맡게 하기' }],
    alwaysAsk: false,
  };
  const { rerender } = render(
    <PlayScreen run={{ ...run, pendingChoice: pending }} onChange={() => {}} />,
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('선택의 순간 · 두부');

  rerender(
    <PlayScreen
      run={{ ...run, pendingChoice: { ...pending, partnerId: first.id } }}
      onChange={() => {}}
    />,
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('선택의 순간 · 두부와 보리');
});
