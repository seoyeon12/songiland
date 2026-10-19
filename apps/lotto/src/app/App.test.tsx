import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

it('shows the lotto show at the app root', () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole('heading', { name: '송이의 행운 로또쇼' }),
  ).toBeVisible();
});

it('sends unknown paths back to the show', () => {
  render(
    <MemoryRouter initialEntries={['/nowhere']}>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole('heading', { name: '송이의 행운 로또쇼' }),
  ).toBeVisible();
});
