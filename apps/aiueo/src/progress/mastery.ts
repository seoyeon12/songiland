/**
 * 숙련도: 문자마다 5단계 라이트너 상자(기획서 7장).
 *
 * - 맞히면 한 칸 위(5단계가 끝), 틀리면 1단계로 내려간다.
 * - 상자별 복습 간격은 당일/1/3/7/14일. 답한 날에 간격을 더한 날이 복습일이다.
 * - 처음 답하는 문자는 1단계 상자에 있던 것으로 본다. 맞히면 2단계(내일 복습), 틀리면 1단계(오늘 복습).
 *
 * 시간은 늘 `now`로 받는다. 화면은 `new Date()`를, 테스트는 고정한 날짜를 넣는다.
 * 날짜는 기기 시간대의 달력 날짜(`YYYY-MM-DD`)로 다룬다. 밤 11시에 틀린 문자는 그날이 복습일이다.
 */

/** 숙련도를 따로 기록하는 기술. 읽기는 2단계(퀴즈), 쓰기는 3단계(획순 쓰기)에서 채운다. */
export type Skill = 'reading' | 'writing';

export const SKILLS: readonly Skill[] = ['reading', 'writing'];

export const MAX_BOX = 5;

/** 상자 n(1~5)의 복습 간격(일). 인덱스는 n − 1. */
export const BOX_INTERVAL_DAYS: readonly number[] = [0, 1, 3, 7, 14];

/** 최근 답을 이만큼만 남긴다. 약한 문자 판단과 저장 용량 모두 이 정도면 충분하다. */
export const RECENT_LIMIT = 10;

/** 약한 문자: 최근 `WEAK_WINDOW`번 답 중 틀린 비율이 `WEAK_RATE` 이상. */
export const WEAK_WINDOW = 5;
export const WEAK_RATE = 0.3;

export type MasteryRecord = {
  /** 1~5단계 상자. */
  box: number;
  /** 복습일(`YYYY-MM-DD`). 이날부터 "복습할 문자"에 나온다. */
  due: string;
  /** 최근 답. 1은 맞힘, 0은 틀림. 오래된 것부터, 최대 `RECENT_LIMIT`개. */
  recent: Array<0 | 1>;
};

/** 문자 id → 기록. */
export type MasteryMap = Readonly<Record<string, MasteryRecord>>;

/** 기술별 숙련도 기록. */
export type MasteryBook = Readonly<Record<Skill, MasteryMap>>;

export const EMPTY_MASTERY: MasteryBook = { reading: {}, writing: {} };

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 기기 시간대 기준 달력 날짜. */
export function dayKey(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD`에 며칠을 더한다. 달·해 넘김과 서머타임은 Date가 맞춰 준다. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return dayKey(new Date(year, month - 1, date + days));
}

/** 답 하나를 반영한 새 기록. `record`가 없으면 처음 답한 문자다. */
export function applyAnswer(
  record: MasteryRecord | undefined,
  correct: boolean,
  now: Date,
): MasteryRecord {
  const box = correct ? Math.min(MAX_BOX, (record?.box ?? 1) + 1) : 1;
  const recent = [...(record?.recent ?? []), correct ? 1 : 0].slice(-RECENT_LIMIT) as Array<0 | 1>;
  return { box, due: addDays(dayKey(now), BOX_INTERVAL_DAYS[box - 1] ?? 0), recent };
}

/** 복습일이 되었는가(지난 것 포함). */
export function isDue(record: MasteryRecord, today: string): boolean {
  return record.due <= today;
}

/** 최근 `WEAK_WINDOW`번 답의 오답률. 답한 적이 없으면 `null`. */
export function recentErrorRate(record: MasteryRecord): number | null {
  const window = record.recent.slice(-WEAK_WINDOW);
  if (window.length === 0) {
    return null;
  }
  return window.filter((answer) => answer === 0).length / window.length;
}

export function isWeak(record: MasteryRecord): boolean {
  return (recentErrorRate(record) ?? 0) >= WEAK_RATE;
}

/** 화면에 보일 숙련도. 0은 아직 풀어 보지 않은 문자. */
export function masteryLevel(record: MasteryRecord | undefined): number {
  return record?.box ?? 0;
}
