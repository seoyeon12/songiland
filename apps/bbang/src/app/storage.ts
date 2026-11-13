import { EMPTY_WALLET, maxLevel, UPGRADE_IDS, type Wallet } from '../engine';
import type { LoggedInput } from '../game/session';

const BEST_KEY = 'songiland:bbang:best:v1';
const GHOST_KEY = 'songiland:bbang:ghost:v1';
const OWN_KEY = 'songiland:bbang:own-best:v1';
const WALLET_KEY = 'songiland:bbang:wallet:v1';
const TUTORIAL_KEY = 'songiland:bbang:tutorial:v1';
const PROBE_KEY = 'songiland:bbang:probe';

/** 날짜별 최고 기록은 최근 날짜부터 이만큼만 남긴다. */
export const DAILY_HISTORY_LIMIT = 30;

/** 오늘의 장사(날짜별) 최고 기록. */
export type DailyBest = {
  /** 'YYYY-MM-DD'(UTC) */
  day: string;
  score: number;
  bestStreak: number;
  recordedAt: number;
};

/** 최고 기록 판의 입력 로그. 다음 판에 고스트로 띄운다. */
export type Ghost = {
  day: string;
  seed: number;
  /** session.RULES_VERSION. 규칙이 바뀌면 다시 돌릴 수 없으니 버린다. */
  rules: number;
  score: number;
  inputs: LoggedInput[];
};

export type RecordResult = {
  /** 이번 판 전의 최고 점수(처음이면 null). */
  previousBest: number | null;
  isNewBest: boolean;
};

/** 기록은 이 브라우저에만 저장한다. 서버로 보내지 않는다. */
export type BbangStore = {
  /** 저장이 막힌 환경(시크릿 모드 등)이면 'memory' — 새로 고치면 사라진다. */
  persistence: 'local' | 'memory';
  dailyBest(day: string): DailyBest | null;
  ownBest(): number | null;
  ghost(day: string, rules: number): Ghost | null;
  /** 오늘의 장사 한 판을 기록한다. 최고 기록을 깨면 그 판을 고스트로 남긴다. */
  recordDaily(
    entry: Omit<DailyBest, 'recordedAt'> & { seed: number; rules: number; inputs: LoggedInput[] },
    recordedAt?: number,
  ): RecordResult;
  /** '내 가게' 모드 최고점을 기록한다. */
  recordOwn(score: number): RecordResult;
  /** 가게 지갑(포인트·누적 매출·업그레이드 단계). */
  wallet(): Wallet;
  saveWallet(wallet: Wallet): void;
  /** 튜토리얼을 끝낸 적이 있는지. */
  tutorialDone(): boolean;
  markTutorialDone(): void;
};

function defaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDailyBest(value: unknown): value is DailyBest {
  return (
    isObject(value) &&
    typeof value.day === 'string' &&
    typeof value.score === 'number' &&
    typeof value.bestStreak === 'number' &&
    typeof value.recordedAt === 'number'
  );
}

function isGhost(value: unknown): value is Ghost {
  return (
    isObject(value) &&
    typeof value.day === 'string' &&
    typeof value.seed === 'number' &&
    typeof value.rules === 'number' &&
    typeof value.score === 'number' &&
    Array.isArray(value.inputs) &&
    value.inputs.every(
      (entry) => isObject(entry) && typeof entry.atMs === 'number' && isObject(entry.input),
    )
  );
}

/** 저장된 지갑을 읽는다. 틀린 값은 버리고, 업그레이드 단계는 0~끝 단계로 자른다. */
function toWallet(value: unknown): Wallet {
  if (!isObject(value) || typeof value.points !== 'number' || !isObject(value.upgrades)) {
    return EMPTY_WALLET;
  }
  const saved = value.upgrades;
  const upgrades = { ...EMPTY_WALLET.upgrades };
  for (const id of UPGRADE_IDS) {
    const level = saved[id];
    upgrades[id] =
      typeof level === 'number' && Number.isInteger(level)
        ? Math.min(maxLevel(id), Math.max(0, level))
        : 0;
  }
  return {
    points: Math.max(0, Math.floor(value.points)),
    totalRevenue: typeof value.totalRevenue === 'number' ? value.totalRevenue : 0,
    upgrades,
  };
}

export function createBbangStore(storage: Storage | undefined = defaultStorage()): BbangStore {
  let persistence: BbangStore['persistence'] = 'memory';
  if (storage) {
    try {
      storage.setItem(PROBE_KEY, '1');
      storage.removeItem(PROBE_KEY);
      persistence = 'local';
    } catch {
      persistence = 'memory';
    }
  }
  const backend = persistence === 'local' && storage ? storage : memoryStorage();

  function read(key: string): unknown {
    try {
      const raw = backend.getItem(key);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  }

  function write(key: string, value: unknown): void {
    try {
      backend.setItem(key, JSON.stringify(value));
    } catch {
      // 공간이 꽉 찼거나 막혔으면 이번 기록은 남기지 못한다(게임은 계속된다).
    }
  }

  function bests(): DailyBest[] {
    const parsed = read(BEST_KEY);
    return Array.isArray(parsed) ? parsed.filter(isDailyBest) : [];
  }

  function ownBest(): number | null {
    const parsed = read(OWN_KEY);
    return isObject(parsed) && typeof parsed.score === 'number' ? parsed.score : null;
  }

  return {
    persistence,
    dailyBest: (day) => bests().find((best) => best.day === day) ?? null,
    ownBest,
    ghost(day, rules) {
      const parsed = read(GHOST_KEY);
      return isGhost(parsed) && parsed.day === day && parsed.rules === rules ? parsed : null;
    },
    recordDaily(entry, recordedAt = Date.now()) {
      const previous = bests().find((best) => best.day === entry.day) ?? null;
      const previousBest = previous?.score ?? null;
      const isNewBest = previousBest === null || entry.score > previousBest;
      if (!isNewBest) {
        return { previousBest, isNewBest };
      }
      const record: DailyBest = {
        day: entry.day,
        score: entry.score,
        bestStreak: entry.bestStreak,
        recordedAt,
      };
      const others = bests().filter((best) => best.day !== entry.day);
      const kept = [record, ...others]
        .sort((a, b) => (a.day < b.day ? 1 : -1))
        .slice(0, DAILY_HISTORY_LIMIT);
      write(BEST_KEY, kept);
      const ghost: Ghost = {
        day: entry.day,
        seed: entry.seed,
        rules: entry.rules,
        score: entry.score,
        inputs: entry.inputs,
      };
      write(GHOST_KEY, ghost);
      return { previousBest, isNewBest };
    },
    recordOwn(score) {
      const previousBest = ownBest();
      const isNewBest = previousBest === null || score > previousBest;
      if (isNewBest) {
        write(OWN_KEY, { score });
      }
      return { previousBest, isNewBest };
    },
    wallet: () => toWallet(read(WALLET_KEY)),
    saveWallet: (wallet) => write(WALLET_KEY, wallet),
    tutorialDone: () => read(TUTORIAL_KEY) === true,
    markTutorialDone: () => write(TUTORIAL_KEY, true),
  };
}
