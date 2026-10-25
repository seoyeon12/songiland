import { appUrl } from '@songiland/catalog';
import { fireEvent, render, screen } from '@testing-library/react';
import { createHistoryRepository } from './history/historyRepository';
import { LottoGame } from './LottoGame';

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

function renderGame() {
  const repository = createHistoryRepository(blockedStorage);
  render(<LottoGame random={() => 0} historyRepository={repository} />);
  return repository;
}

function mainNumbers(): string[] {
  return screen
    .getAllByRole('listitem', { name: /^본번호 \d: / })
    .map((item) => item.textContent ?? '');
}

it('starts with empty slots, the draw button, and the entertainment notice', () => {
  renderGame();
  expect(screen.getAllByRole('listitem', { name: /빈 자리/ })).toHaveLength(6);
  expect(screen.getByRole('button', { name: '번호 뽑기' })).toBeVisible();
  expect(
    screen.getByText(/실제 복권 발행·판매·당첨 확인 서비스가 아니며/),
  ).toBeVisible();
});

it('links back to the Songiland portal', () => {
  renderGame();
  expect(screen.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
    'href',
    appUrl('portal', 'local'),
  );
});

it('draws seven numbers with one click and saves one record', () => {
  const repository = renderGame();
  fireEvent.click(screen.getByRole('button', { name: '번호 뽑기' }));
  expect(mainNumbers()).toHaveLength(6);
  expect(screen.getByRole('img', { name: /^보너스 번호: \d+$/ })).toBeVisible();
  expect(
    screen.getByText('보너스 번호는 게임쇼 연출이에요. 실제 구매 번호는 본번호 6개뿐!'),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: '다시 뽑기' })).toBeVisible();
  expect(repository.list(new Date())).toHaveLength(1);
});

it('draws with Space from the page and blocks scrolling', () => {
  const repository = renderGame();
  const notCancelled = fireEvent.keyDown(document.body, { key: ' ' });
  expect(notCancelled).toBe(false);
  expect(mainNumbers()).toHaveLength(6);
  expect(repository.list(new Date())).toHaveLength(1);
});

it('ignores held-down Space repeats and modified Space', () => {
  const repository = renderGame();
  fireEvent.keyDown(document.body, { key: ' ', repeat: true });
  fireEvent.keyDown(document.body, { key: ' ', shiftKey: true });
  expect(repository.list(new Date())).toHaveLength(0);
});

it('leaves Space to the focused control instead of drawing twice', () => {
  const repository = renderGame();
  fireEvent.keyDown(screen.getByRole('button', { name: '최근 기록' }), {
    key: ' ',
  });
  expect(repository.list(new Date())).toHaveLength(0);
});

it('ignores Space while the history panel is open', () => {
  const repository = renderGame();
  fireEvent.click(screen.getByRole('button', { name: '최근 기록' }));
  fireEvent.keyDown(document.body, { key: ' ' });
  expect(repository.list(new Date())).toHaveLength(0);
});

it('saves every draw and warns when history is memory-only', () => {
  const repository = renderGame();
  expect(
    screen.getByText('이 기기에서는 기록이 유지되지 않을 수 있어요.'),
  ).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '번호 뽑기' }));
  fireEvent.click(screen.getByRole('button', { name: '다시 뽑기' }));
  expect(repository.list(new Date())).toHaveLength(2);
});
