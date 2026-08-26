import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { App } from './App';

it('links the Songiland gateway to the first lotto game', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: '송이랜드' })).toBeVisible();
  expect(screen.getByRole('link', { name: '첫 번째 게임: 송이의 행운 로또쇼' })).toHaveAttribute(
    'href',
    '/games/lotto',
  );
});
