import { render, screen } from '@testing-library/react';
import { ResultCard } from './ResultCard';

it('shows six sorted purchase numbers and labels the bonus as show-only', () => {
  render(
    <ResultCard
      mainNumbers={[42, 4, 23, 8, 16, 15]}
      bonusNumber={7}
      drawnAt="2026-08-26T12:00:00.000Z"
      onRestart={() => {}}
      onOpenHistory={() => {}}
    />,
  );
  expect(screen.getByText('오늘의 송이 픽!')).toBeVisible();
  expect(screen.getByText('4')).toBeVisible();
  expect(
    screen.getByText(
      '보너스 번호는 게임쇼 연출이에요. 실제 구매 번호는 본번호 6개뿐!',
    ),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: '한 번 더 뽑기' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '최근 행운 기록 보기' })).toBeEnabled();
});

it('renders exactly six main balls and one bonus ball, never seven purchase balls', () => {
  render(
    <ResultCard
      mainNumbers={[42, 4, 23, 8, 16, 15]}
      bonusNumber={7}
      drawnAt="2026-08-26T12:00:00.000Z"
      onRestart={() => {}}
      onOpenHistory={() => {}}
    />,
  );
  expect(screen.getAllByRole('listitem', { name: /본번호/ })).toHaveLength(6);
  expect(screen.getByRole('listitem', { name: '보너스 번호 7' })).toBeVisible();
});
