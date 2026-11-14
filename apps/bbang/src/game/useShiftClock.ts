import { useCallback, useEffect, useRef } from 'react';

/**
 * 경과 시간 기반 장사 시계. setInterval 누적 오차를 피하려고 performance.now()로 흐른 시간을
 * 잰다. 탭을 숨기거나 held(그만둘지 묻는 중)이면 멈췄다가 이어 가(몰아 처리 방지), durationMs에
 * 닿으면 멈춘다.
 *
 * 돌려주는 hitstop(ms)은 장사 시간을 그만큼 멈춘다(손맛: Perfect 순간 "딱!" 하고 멈칫).
 * 시계를 뒤로 미는 방식이라 리듀서의 tick은 그동안 같은 시각에 머문다.
 */
export function useShiftClock(
  durationMs: number,
  running: boolean,
  onTick: (elapsedMs: number) => void,
  held = false,
): (ms: number) => void {
  const onTickRef = useRef(onTick);
  const heldRef = useRef(held);
  const startRef = useRef(0);
  useEffect(() => {
    onTickRef.current = onTick;
    heldRef.current = held;
  });

  useEffect(() => {
    if (!running) {
      return;
    }
    let raf = 0;
    startRef.current = performance.now();
    let paused = false;
    let pausedAt = 0;
    let holding = false;
    let heldAt = 0;

    const loop = (now: number) => {
      // 붙잡힌 동안 흐른 시간은 놓을 때 시작 시각을 그만큼 밀어 지운다.
      if (heldRef.current && !holding) {
        holding = true;
        heldAt = now;
      } else if (!heldRef.current && holding) {
        holding = false;
        startRef.current += now - heldAt;
      }
      if (!paused && !holding) {
        const elapsed = now - startRef.current;
        onTickRef.current(Math.min(Math.max(0, elapsed), durationMs));
        if (elapsed >= durationMs) {
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (holding) {
        return; // 이미 붙잡혀 멈춰 있다(숨긴 시간까지 놓을 때 한 번에 지운다).
      }
      if (document.hidden) {
        paused = true;
        pausedAt = performance.now();
      } else if (paused) {
        paused = false;
        startRef.current += performance.now() - pausedAt;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [durationMs, running]);

  return useCallback((ms: number) => {
    startRef.current += ms;
  }, []);
}
