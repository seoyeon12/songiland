import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { DrawRecord } from '../history/types';
import { HistoryPanel } from './HistoryPanel';

const record: DrawRecord = {
  id: 'r1',
  drawnAt: '2026-08-26T12:00:00.000Z',
  mainNumbers: [4, 8, 15, 16, 23, 42],
  bonusNumber: 7,
};

it('confirms before clearing the recent 24-hour history', async () => {
  const user = userEvent.setup();
  const onClear = vi.fn();
  render(
    <HistoryPanel
      isOpen
      records={[record]}
      onClose={() => {}}
      onClear={onClear}
    />,
  );
  await user.click(screen.getByRole('button', { name: '기록 모두 지우기' }));
  expect(
    screen.getByRole('dialog', { name: '기록을 모두 지울까요?' }),
  ).toBeVisible();
  await user.click(screen.getByRole('button', { name: '지우기' }));
  expect(onClear).toHaveBeenCalledOnce();
});

it('shows the record count and newest records first', () => {
  const older: DrawRecord = { ...record, id: 'older', drawnAt: '2026-08-26T11:00:00.000Z' };
  render(
    <HistoryPanel
      isOpen
      records={[record, older]}
      onClose={() => {}}
      onClear={() => {}}
    />,
  );
  expect(screen.getByText('최근 24시간의 행운 기록 · 2/20')).toBeVisible();
});

it('shows the empty prompt when there are no records', () => {
  render(
    <HistoryPanel isOpen records={[]} onClose={() => {}} onClear={() => {}} />,
  );
  expect(screen.getByText('송이와 첫 번째 행운번호를 뽑아볼까?')).toBeVisible();
  expect(
    screen.queryByRole('button', { name: '기록 모두 지우기' }),
  ).not.toBeInTheDocument();
});

it('renders nothing while closed so it traps neither focus nor scroll', () => {
  const { container } = render(
    <HistoryPanel
      isOpen={false}
      records={[record]}
      onClose={() => {}}
      onClear={() => {}}
    />,
  );
  expect(container).toBeEmptyDOMElement();
});
