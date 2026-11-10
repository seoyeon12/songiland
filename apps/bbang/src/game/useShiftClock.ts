import { useEffect, useRef } from 'react';

/**
 * 경과 시간 기반 장사 시계. setInterval 누적 오차를 피하려고 performance.now()로 흐른 시간을
 * 잰다. 탭을 숨기면 멈췄다가 돌아오면 이어 가(몰아 처리 방지), durationMs에 닿으면 멈춘다.
 */
export function useShiftClock(
  durationMs: number,
  running: boolean,
  onTick: (elapsedMs: number) => void,
): void {
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  });

  useEffect(() => {
    if (!running) {
      return;
    }
    let raf = 0;
    let start = performance.now();
    let paused = false;
    let pausedAt = 0;

    const loop = (now: number) => {
      if (!paused) {
        const elapsed = now - start;
        onTickRef.current(Math.min(elapsed, durationMs));
        if (elapsed >= durationMs) {
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
        pausedAt = performance.now();
      } else if (paused) {
        paused = false;
        start += performance.now() - pausedAt;
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [durationMs, running]);
}
