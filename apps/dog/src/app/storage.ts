import type { RunState } from '../engine';

const KEY = 'songiland:gyeonsaeng:run';
const PROBE_KEY = 'songiland:gyeonsaeng:probe';

/** 진행 중인 판을 이 브라우저에만 저장한다. 서버로 보내지 않는다. */
export type RunStore = {
  load(): RunState | null;
  save(run: RunState): void;
  clear(): void;
  /** 저장이 막힌 환경(시크릿 모드 등)이면 'memory' — 새로 고치면 사라진다. */
  persistence: 'local' | 'memory';
};

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** 저장된 값이 지금 버전의 판 상태인지 가볍게 확인한다. */
export function isRunState(value: unknown): value is RunState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const run = value as Partial<RunState>;
  return (
    run.version === 1 &&
    typeof run.seed === 'number' &&
    typeof run.rngState === 'number' &&
    typeof run.month === 'number' &&
    Array.isArray(run.dogs) &&
    run.dogs.length > 0 &&
    Array.isArray(run.log) &&
    Array.isArray(run.timeline) &&
    Array.isArray(run.scheduled) &&
    (run.status === 'running' || run.status === 'ended')
  );
}

export function createRunStore(storage: Storage | undefined = defaultStorage()): RunStore {
  let memory: RunState | null = null;
  let persistence: RunStore['persistence'] = 'memory';
  if (storage) {
    try {
      storage.setItem(PROBE_KEY, '1');
      storage.removeItem(PROBE_KEY);
      persistence = 'local';
    } catch {
      persistence = 'memory';
    }
  }

  return {
    persistence,
    load() {
      if (persistence === 'memory' || !storage) {
        return memory;
      }
      try {
        const raw = storage.getItem(KEY);
        if (!raw) {
          return null;
        }
        const parsed: unknown = JSON.parse(raw);
        return isRunState(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(run) {
      memory = run;
      if (persistence === 'local' && storage) {
        try {
          storage.setItem(KEY, JSON.stringify(run));
        } catch {
          // 저장 공간이 꽉 찼거나 막혔으면 이번 판은 메모리에만 둔다.
        }
      }
    },
    clear() {
      memory = null;
      try {
        storage?.removeItem(KEY);
      } catch {
        // 지울 수 없어도 다음 load에서 무시된다.
      }
    },
  };
}
