import { afterEach, beforeEach } from 'vitest';
import { createHistoryRepository } from './historyRepository';

const now = new Date('2026-08-26T12:00:00.000Z');

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

it('prunes records older than 24 hours and retains only the newest 20', () => {
  const repository = createHistoryRepository(window.localStorage);
  for (let index = 0; index < 21; index += 1) {
    repository.save(
      {
        id: String(index),
        drawnAt: new Date(now.getTime() - index * 60_000).toISOString(),
        mainNumbers: [1, 2, 3, 4, 5, 6],
        bonusNumber: 7,
      },
      now,
    );
  }
  repository.save(
    {
      id: 'expired',
      drawnAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1).toISOString(),
      mainNumbers: [8, 9, 10, 11, 12, 13],
      bonusNumber: 14,
    },
    now,
  );
  expect(repository.list(now)).toHaveLength(20);
  expect(repository.list(now).some((record) => record.id === 'expired')).toBe(
    false,
  );
});

it('lists newest records first and reports local persistence', () => {
  const repository = createHistoryRepository(window.localStorage);
  repository.save(
    {
      id: 'older',
      drawnAt: new Date(now.getTime() - 10 * 60_000).toISOString(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonusNumber: 7,
    },
    now,
  );
  repository.save(
    {
      id: 'newer',
      drawnAt: new Date(now.getTime() - 1 * 60_000).toISOString(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonusNumber: 7,
    },
    now,
  );
  expect(repository.list(now).map((record) => record.id)).toEqual([
    'newer',
    'older',
  ]);
  expect(repository.persistence).toBe('local');
});

it('discards malformed entries without blocking valid ones', () => {
  window.localStorage.setItem(
    'songiland:lotto:draws:v1',
    JSON.stringify([
      { id: 'bad', drawnAt: 'not-a-date', mainNumbers: [1], bonusNumber: 7 },
      {
        id: 'good',
        drawnAt: new Date(now.getTime() - 60_000).toISOString(),
        mainNumbers: [1, 2, 3, 4, 5, 6],
        bonusNumber: 7,
      },
    ]),
  );
  const repository = createHistoryRepository(window.localStorage);
  const listed = repository.list(now);
  expect(listed).toHaveLength(1);
  expect(listed[0].id).toBe('good');
});

it('clears only its own storage key', () => {
  const repository = createHistoryRepository(window.localStorage);
  window.localStorage.setItem('unrelated', 'keep-me');
  repository.save(
    {
      id: 'one',
      drawnAt: now.toISOString(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonusNumber: 7,
    },
    now,
  );
  repository.clear();
  expect(repository.list(now)).toHaveLength(0);
  expect(window.localStorage.getItem('unrelated')).toBe('keep-me');
});

it('falls back to memory when storage access throws', () => {
  const throwingStorage = {
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
  const repository = createHistoryRepository(throwingStorage);
  expect(repository.persistence).toBe('memory');
  repository.save(
    {
      id: 'mem',
      drawnAt: now.toISOString(),
      mainNumbers: [1, 2, 3, 4, 5, 6],
      bonusNumber: 7,
    },
    now,
  );
  expect(repository.list(now)).toHaveLength(1);
});
