import type { RunState } from '../engine';

const KEY = 'songiland:gyeonsaeng:run';
const LIVES_KEY = 'songiland:gyeonsaeng:lives';
const PROBE_KEY = 'songiland:gyeonsaeng:probe';

/** 지난 견생은 최근 것부터 이만큼만 남긴다. */
export const PAST_LIVES_LIMIT = 10;

/** 끝난 판 하나. 결말 카드와 이야기 전체를 다시 볼 수 있게 판 상태를 그대로 둔다. */
export type PastLife = {
  /** 막을 내린 시각(ms) */
  endedAt: number;
  run: RunState;
};

/** 진행 중인 판과 지난 견생을 이 브라우저에만 저장한다. 서버로 보내지 않는다. */
export type RunStore = {
  load(): RunState | null;
  save(run: RunState): void;
  clear(): void;
  /** 지난 견생, 최근 것부터. */
  pastLives(): PastLife[];
  /** 끝난 판을 지난 견생 맨 앞에 넣는다. 같은 판(시드)이 이미 있으면 바꿔 넣는다. */
  remember(run: RunState, endedAt?: number): void;
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
    run.version === 2 &&
    typeof run.seed === 'number' &&
    typeof run.rngState === 'number' &&
    typeof run.month === 'number' &&
    Array.isArray(run.dogs) &&
    run.dogs.length > 0 &&
    Array.isArray(run.pairs) &&
    Array.isArray(run.log) &&
    Array.isArray(run.timeline) &&
    Array.isArray(run.scheduled) &&
    (run.status === 'running' || run.status === 'ended')
  );
}

function isPastLife(value: unknown): value is PastLife {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const life = value as Partial<PastLife>;
  return typeof life.endedAt === 'number' && isRunState(life.run) && life.run.status === 'ended';
}

function readLives(storage: Storage): PastLife[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(LIVES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isPastLife).slice(0, PAST_LIVES_LIMIT) : [];
  } catch {
    return [];
  }
}

/** 공간이 모자라면 오래된 견생부터 덜어 내며 다시 써 본다. */
function writeLives(storage: Storage, lives: readonly PastLife[]): void {
  for (let count = lives.length; count > 0; count -= 1) {
    try {
      storage.setItem(LIVES_KEY, JSON.stringify(lives.slice(0, count)));
      return;
    } catch {
      // 한 편 덜어 내고 다시 써 본다.
    }
  }
}

export function createRunStore(storage: Storage | undefined = defaultStorage()): RunStore {
  let memory: RunState | null = null;
  let memoryLives: PastLife[] = [];
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

  function pastLives(): PastLife[] {
    return persistence === 'local' && storage ? readLives(storage) : memoryLives;
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
    pastLives,
    remember(run, endedAt = Date.now()) {
      const others = pastLives().filter((life) => life.run.seed !== run.seed);
      memoryLives = [{ endedAt, run }, ...others].slice(0, PAST_LIVES_LIMIT);
      if (persistence === 'local' && storage) {
        writeLives(storage, memoryLives);
      }
    },
  };
}
