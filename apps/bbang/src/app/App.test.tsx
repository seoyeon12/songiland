import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NO_UPGRADES } from '../engine';
import { App } from './App';
import { createBbangStore } from './storage';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

describe('App shop', () => {
  it('spends points on an upgrade and keeps it', () => {
    const storage = memoryStorage();
    const store = createBbangStore(storage);
    store.saveWallet({ points: 300, totalRevenue: 0, upgrades: NO_UPGRADES });
    render(<App store={store} />);

    fireEvent.click(screen.getByRole('button', { name: /상점 · 300P/ }));
    expect(screen.getByRole('button', { name: '틀 늘리기 300P에 사기' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '비싼 반죽 400P에 사기' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '거치대 넓히기 250P에 사기' }));
    expect(screen.getByText('50P')).toBeInTheDocument();
    expect(createBbangStore(storage).wallet()).toMatchObject({ points: 50, upgrades: { rack: 1 } });

    fireEvent.click(screen.getByRole('button', { name: '돌아가기' }));
    expect(screen.getByRole('button', { name: /상점 · 50P/ })).toBeInTheDocument();
  });
});
