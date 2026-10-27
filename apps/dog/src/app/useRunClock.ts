import { useEffect, useEffectEvent, useState } from 'react';

export type Speed = 1 | 2 | 4;

/** running인 동안 intervalMs마다 onTick을 부른다(한 달이 흐르는 시간). */
export function useRunClock({
  running,
  intervalMs,
  onTick,
}: {
  running: boolean;
  intervalMs: number;
  onTick: () => void;
}): void {
  const tick = useEffectEvent(onTick);
  useEffect(() => {
    if (!running) {
      return;
    }
    const id = window.setInterval(() => tick(), intervalMs);
    return () => window.clearInterval(id);
  }, [running, intervalMs]);
}

/** 탭이 숨겨지면 onHidden을 부른다(자동 일시정지용). */
export function useOnPageHidden(onHidden: () => void): void {
  const hidden = useEffectEvent(onHidden);
  useEffect(() => {
    function onChange() {
      if (document.hidden) {
        hidden();
      }
    }
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
}

/** 선택 카드가 떠 있을 때 자동 결정이 켜져 있으면 잠시 보여 준 뒤 고른다. */
export function useAutoDecide({
  active,
  delayMs,
  onDecide,
}: {
  active: boolean;
  delayMs: number;
  onDecide: () => void;
}): void {
  const decide = useEffectEvent(onDecide);
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = window.setTimeout(() => decide(), delayMs);
    return () => window.clearTimeout(id);
  }, [active, delayMs]);
}

/** 기기마다 기억해 두는 작은 설정(속도·자동 결정). 저장이 막혀도 동작한다. */
export function usePreference<T extends string | number | boolean>(
  key: string,
  initial: T,
): [T, (value: T) => void] {
  const storageKey = `songiland:gyeonsaeng:pref:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  function update(next: T) {
    setValue(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // 설정을 기억하지 못해도 이번 방문에서는 동작한다.
    }
  }
  return [value, update];
}
