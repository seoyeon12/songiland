import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { simulateToEnd, startRun, summarize, type RunState } from '../engine';
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

/** 첫째를 보낸 뒤에도 남은 아이가 있는 판 */
function runWithSurvivor(): RunState {
  for (let seed = 3000; seed < 3400; seed += 1) {
    const run = simulateToEnd(startRun({ seed, name: '두부' }));
    if (run.epilogue) {
      return run;
    }
  }
  throw new Error('남은 아이가 있는 판을 찾지 못했습니다.');
}

it("keeps a card for each other dog and tells the rest of the survivors' lives", () => {
  const run = runWithSurvivor();
  const survivor = run.epilogue!.dogs[0];
  render(<EndingScreen run={run} onAgain={() => {}} />);

  expect(screen.getByRole('heading', { name: '함께한 가족' })).toBeVisible();
  const card = screen.getByRole('article', { name: `${survivor.name}의 견생` });
  expect(card).toHaveTextContent('남은 아이의 이야기');
  expect(card).toHaveTextContent(/두부를 보낸 뒤에도 .+ 더 함께했어요\./);

  fireEvent.click(screen.getByRole('button', { name: '이야기 전체 보기' }));
  expect(screen.getByRole('heading', { name: '남은 아이들의 이야기' })).toBeVisible();
});
