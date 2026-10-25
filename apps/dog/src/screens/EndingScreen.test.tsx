import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { simulateToEnd, startRun, summarize } from '../engine';
import { EndingScreen } from './EndingScreen';

it('shows the life record with the arc title, moments and map', () => {
  const run = simulateToEnd(startRun({ seed: 2024, name: '두부' }));
  const record = summarize(run);
  const onAgain = vi.fn();
  render(<EndingScreen run={run} onAgain={onAgain} />);

  expect(screen.getByText(`이번 상영작 · ${record.arcTitle}`)).toBeVisible();
  expect(screen.getByRole('heading', { name: '두부의 견생' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '기억에 남는 순간' })).toBeVisible();
  expect(screen.getByRole('list', { name: /견생 지도/ })).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: '이야기 전체 보기' }));
  expect(screen.getByText('두부와 가족이 됐어요.')).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: '한 번 더 상영하기' }));
  expect(onAgain).toHaveBeenCalledOnce();
});
