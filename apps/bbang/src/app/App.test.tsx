import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('App shop', () => {
  it('spends points on an upgrade and keeps it', async () => {
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
    expect(await screen.findByRole('button', { name: /상점 · 50P/ })).toBeInTheDocument();
  });
});

describe('App history', () => {
  it('gives each screen an address and comes back to the start with the back button', async () => {
    render(<App store={createBbangStore(memoryStorage())} />);
    expect(window.history.state).toEqual({ bbang: 'start', depth: 0 });

    fireEvent.click(screen.getByRole('button', { name: /상점/ }));
    expect(window.location.pathname).toBe('/shop');
    act(() => window.history.back());
    expect(await screen.findByRole('button', { name: /튜토리얼부터/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');

    fireEvent.click(screen.getByRole('button', { name: '오늘의 장사 시작' }));
    expect(window.location.pathname).toBe('/play');
    expect(screen.getAllByRole('button', { name: /반죽 붓기/ })).toHaveLength(4);

    // 장사 중 뒤로가기는 바로 나가지 않고 묻는다. 계속하면 주소·판이 그대로다.
    act(() => window.history.back());
    const ask = await screen.findByRole('alertdialog', { name: '오늘의 장사를 그만둘까요?' });
    expect(window.location.pathname).toBe('/play');
    fireEvent.click(within(ask).getByRole('button', { name: '계속 장사하기' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /반죽 붓기/ })).toHaveLength(4);

    // 다시 뒤로가기 → 그만두기: 기록 없이 처음 화면으로.
    act(() => window.history.back());
    fireEvent.click(await screen.findByRole('button', { name: '그만두기' }));
    expect(await screen.findByRole('button', { name: /튜토리얼부터/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(screen.getByText('아직 없음')).toBeInTheDocument();
  });

  it('opens the shop or the tutorial straight from the address, but never a half-played shift', () => {
    window.history.replaceState(null, '', '/tutorial');
    const { unmount } = render(<App store={createBbangStore(memoryStorage())} />);
    expect(screen.getByRole('list', { name: '튜토리얼 단계' })).toBeInTheDocument();
    expect(window.history.state).toEqual({ bbang: 'tutorial', depth: 0 });
    unmount();

    window.history.replaceState(null, '', '/result');
    render(<App store={createBbangStore(memoryStorage())} />);
    expect(screen.getByRole('button', { name: /튜토리얼부터/ })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});
