import { render, screen, within } from '@testing-library/react';
import { App } from './App';

it('shows the app name and links back to the Songiland portal', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: '아이우에오' })).toBeVisible();
  expect(screen.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
    'href',
    'http://localhost:5173/',
  );
});

it('draws the hiragana seion chart with 46 characters', () => {
  render(<App />);
  const chart = screen.getByRole('table', { name: '히라가나 청음 오십음도' });
  const kana = chart.querySelectorAll('[lang="ja"]');
  expect(kana).toHaveLength(46);
  expect(screen.getByText('청음 46자')).toBeVisible();
});

it('labels rows and columns so each character can be found by row and vowel', () => {
  render(<App />);
  const chart = screen.getByRole('table', { name: '히라가나 청음 오십음도' });
  expect(within(chart).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
    'a', 'i', 'u', 'e', 'o',
  ]);
  const kaRow = within(chart).getByRole('row', { name: /か행/ });
  expect(kaRow).toHaveTextContent('かka카');
  expect(within(kaRow).getAllByRole('cell')).toHaveLength(5);
});

it('shows romaji and a Hangul approximation under each character', () => {
  render(<App />);
  const tsu = document.querySelector('[data-kana-id="hiragana-tsu"]');
  expect(tsu).toHaveTextContent('つtsu츠');
  const wo = document.querySelector('[data-kana-id="hiragana-wo"]');
  expect(wo).toHaveTextContent('をo오');
});

it('keeps the empty gojūon slots as empty cells', () => {
  render(<App />);
  const yaRow = screen.getByRole('row', { name: /や행/ });
  const cells = within(yaRow).getAllByRole('cell');
  expect(cells.map((cell) => cell.textContent)).toEqual(['やya야', '', 'ゆyu유', '', 'よyo요']);
});
