import { render, screen } from '@testing-library/react';
import { NumberBoard } from './NumberBoard';

it('shows six empty main slots and an empty bonus slot before the first draw', () => {
  render(<NumberBoard numbers={null} />);
  expect(screen.getAllByRole('listitem', { name: /빈 자리/ })).toHaveLength(6);
  expect(screen.getByRole('img', { name: '보너스 번호 빈 자리' })).toBeVisible();
});

it('shows six main numbers in order and one separate bonus number', () => {
  render(
    <NumberBoard numbers={{ main: [4, 8, 15, 16, 23, 42], bonus: 7 }} drawKey="d1" />,
  );
  const main = screen.getAllByRole('listitem');
  expect(main).toHaveLength(6);
  expect(main.map((item) => item.textContent)).toEqual([
    '4',
    '8',
    '15',
    '16',
    '23',
    '42',
  ]);
  expect(screen.getByRole('img', { name: '보너스 번호: 7' })).toHaveTextContent('7');
});
