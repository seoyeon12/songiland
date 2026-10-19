import type { DrawHistoryRepository, DrawRecord } from './types';

const HISTORY_KEY = 'songiland:lotto:draws:v1';
const RETENTION_MS = 86_400_000; // 24 hours
const MAX_RECORDS = 20;

function isValidRecord(value: unknown): value is DrawRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string') {
    return false;
  }
  if (typeof record.drawnAt !== 'string' || Number.isNaN(Date.parse(record.drawnAt))) {
    return false;
  }
  if (
    !Array.isArray(record.mainNumbers) ||
    record.mainNumbers.length !== 6 ||
    !record.mainNumbers.every((n) => typeof n === 'number' && Number.isFinite(n))
  ) {
    return false;
  }
  return typeof record.bonusNumber === 'number' && Number.isFinite(record.bonusNumber);
}

/**
 * Drops malformed and expired entries, sorts newest first, and caps the list.
 * Pure: it never touches storage, only the array it is handed.
 */
function normalize(records: unknown, now: Date): DrawRecord[] {
  const source = Array.isArray(records) ? records : [];
  return source
    .filter(isValidRecord)
    .filter((record) => now.getTime() - Date.parse(record.drawnAt) <= RETENTION_MS)
    .sort((a, b) => Date.parse(b.drawnAt) - Date.parse(a.drawnAt))
    .slice(0, MAX_RECORDS);
}

function defaultStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Local-first draw history. Persists to `localStorage` when available and
 * transparently falls back to an in-memory array (per tab) when any storage
 * access throws — e.g. private mode or blocked storage. It never logs the draw
 * data or sends it anywhere.
 */
export function createHistoryRepository(
  storage: Storage | undefined = defaultStorage(),
): DrawHistoryRepository {
  let persistence: 'local' | 'memory' = storage ? 'local' : 'memory';
  let memory: DrawRecord[] = [];

  function toMemory(records: DrawRecord[]): void {
    persistence = 'memory';
    memory = records;
  }

  function read(): DrawRecord[] {
    if (persistence === 'memory' || !storage) {
      return memory;
    }
    try {
      const raw = storage.getItem(HISTORY_KEY);
      return raw ? (JSON.parse(raw) as DrawRecord[]) : [];
    } catch {
      toMemory(memory);
      return memory;
    }
  }

  function write(records: DrawRecord[]): void {
    memory = records;
    if (persistence === 'memory' || !storage) {
      return;
    }
    try {
      storage.setItem(HISTORY_KEY, JSON.stringify(records));
    } catch {
      toMemory(records);
    }
  }

  // Probe once so callers can read `persistence` before any save.
  if (storage) {
    try {
      storage.getItem(HISTORY_KEY);
    } catch {
      toMemory([]);
    }
  }

  return {
    get persistence() {
      return persistence;
    },
    list(now: Date): DrawRecord[] {
      const normalized = normalize(read(), now);
      write(normalized);
      return normalized;
    },
    save(record: DrawRecord, now: Date): DrawRecord[] {
      const normalized = normalize([record, ...read()], now);
      write(normalized);
      return normalized;
    },
    clear(): void {
      memory = [];
      if (persistence === 'memory' || !storage) {
        return;
      }
      try {
        storage.removeItem(HISTORY_KEY);
      } catch {
        toMemory([]);
      }
    },
  };
}
