import { appUrl } from '@songiland/catalog';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { KoEnConverter } from './KoEnConverter';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function type(text: string) {
  fireEvent.change(screen.getByLabelText('입력'), { target: { value: text } });
}

function output() {
  return screen.getByRole('status', { name: '결과' });
}

function copyStatus() {
  return screen.getByRole('status', { name: '복사 안내' });
}

it('converts English keys to Hangul as you type, detecting the direction', () => {
  render(<KoEnConverter />);
  type('dkssudgktpdy');
  expect(output()).toHaveTextContent('안녕하세요');
  expect(screen.getByText('자동 감지 · 영문 → 한글')).toBeVisible();
});

it('converts Hangul back to English keys', () => {
  render(<KoEnConverter />);
  type('한글');
  expect(output()).toHaveTextContent('gksrmf');
  expect(screen.getByText('자동 감지 · 한글 → 영문')).toBeVisible();
});

it('lets the user force a direction', () => {
  render(<KoEnConverter />);
  fireEvent.click(screen.getByLabelText('영문 → 한글'));
  type('안녕 gksrmf');
  expect(output()).toHaveTextContent('안녕 한글');
  expect(screen.queryByText(/자동 감지 ·/)).toBeNull();
});

it('copies the result and confirms briefly', async () => {
  vi.useFakeTimers();
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  render(<KoEnConverter />);
  expect(screen.getByRole('button', { name: '결과 복사' })).toBeDisabled();
  type('gksrmf');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '결과 복사' }));
  });
  expect(writeText).toHaveBeenCalledWith('한글');
  expect(copyStatus()).toHaveTextContent('복사했어요.');
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(copyStatus()).toHaveTextContent('');
});

it('explains when copying is not allowed', async () => {
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  });
  render(<KoEnConverter />);
  type('gksrmf');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: '결과 복사' }));
  });
  expect(copyStatus()).toHaveTextContent('복사하지 못했어요.');
});

it('clears the input', () => {
  render(<KoEnConverter />);
  type('gksrmf');
  fireEvent.click(screen.getByRole('button', { name: '지우기' }));
  expect(screen.getByLabelText('입력')).toHaveValue('');
  expect(output()).toHaveTextContent('');
});

it('links back to the Songiland portal', () => {
  render(<KoEnConverter />);
  expect(screen.getByRole('link', { name: /송이랜드/ })).toHaveAttribute(
    'href',
    appUrl('portal', 'local'),
  );
});
