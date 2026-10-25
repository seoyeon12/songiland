import { useEffect, useEffectEvent } from 'react';

// Space가 이 요소들에서 시작되면 그 요소의 기본 동작(버튼 누르기 등)에 맡기고 뽑지 않는다.
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [contenteditable], [role="dialog"], [data-lotto-control]';

function startedOnControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}

function isSpaceKey(key: string): boolean {
  return key === ' ' || key === 'Spacebar';
}

export type SpaceToDrawOptions = {
  /** false이면 Space를 무시한다(예: 기록 패널이 열려 있을 때). */
  enabled: boolean;
  onDraw: () => void;
};

/**
 * 페이지 어디에서든 Space 한 번에 번호를 뽑는다. 길게 눌러 생기는 반복 입력,
 * 조합 키, 버튼·링크·입력 요소에서 시작된 Space는 무시한다. 뽑을 때만
 * preventDefault로 페이지 스크롤을 막는다.
 */
export function useSpaceToDraw({ enabled, onDraw }: SpaceToDrawOptions): void {
  const draw = useEffectEvent(onDraw);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (!isSpaceKey(event.key) || event.repeat) {
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      if (startedOnControl(event.target)) {
        return;
      }
      event.preventDefault();
      draw();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
