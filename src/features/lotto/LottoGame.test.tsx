import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { createHistoryRepository } from './history/historyRepository';
import { LottoGame } from './LottoGame';

afterEach(() => {
  vi.useRealTimers();
});

// fireEvent (synchronous) is used instead of userEvent because userEvent's
// internal delays deadlock under vi.useFakeTimers().
function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function completeDraw() {
  click('🐾 송이의 행운 발도장');
  act(() => {
    vi.advanceTimersByTime(2_400);
  });
  for (let index = 0; index < 7; index += 1) {
    click(index === 6 ? '보너스 공 뽑기 · Space' : '다음 공 뽑기 · Space');
    act(() => {
      vi.advanceTimersByTime(index === 6 ? 1_500 : 1_200);
    });
  }
}

const blockedStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

it('saves a completed draw once and exposes the entertainment-only result', () => {
  vi.useFakeTimers();
  const memoryRepository = createHistoryRepository(blockedStorage);
  render(
    <LottoGame
      random={() => 0}
      historyRepository={memoryRepository}
      webglSupported={false}
    />,
  );
  completeDraw();
  expect(screen.getByText('오늘의 송이 픽!')).toBeVisible();
  expect(memoryRepository.list(new Date())).toHaveLength(1);
  expect(
    screen.getByText(/실제 복권 발행·판매·당첨 확인 서비스가 아니며/),
  ).toBeVisible();
});

it('warns when history is memory-only and restarts without clearing it', () => {
  vi.useFakeTimers();
  const memoryRepository = createHistoryRepository(blockedStorage);
  render(
    <LottoGame
      random={() => 0}
      historyRepository={memoryRepository}
      webglSupported={false}
    />,
  );
  expect(
    screen.getByText('이 기기에서는 기록이 유지되지 않을 수 있어요.'),
  ).toBeVisible();
  completeDraw();
  click('한 번 더 뽑기');
  // Back to idle, paw button available again, history retained.
  expect(
    screen.getByRole('button', { name: '🐾 송이의 행운 발도장' }),
  ).toBeVisible();
  expect(memoryRepository.list(new Date())).toHaveLength(1);
});
