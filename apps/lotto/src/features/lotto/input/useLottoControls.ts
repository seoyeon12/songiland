import type { KeyboardEvent, PointerEvent } from 'react';

const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [role="dialog"], [data-lotto-control]';

/**
 * True when the event originated on (or inside) a control, link, form field,
 * dialog, or anything marked `data-lotto-control` — i.e. not empty stage space.
 */
function startedOnControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}

function isSpaceKey(key: string): boolean {
  return key === ' ' || key === 'Spacebar';
}

export type LottoControlsOptions = {
  canAct: boolean;
  onPrimaryAction: () => void;
  pawMode: boolean;
};

export type StageProps = {
  onKeyDown: (event: KeyboardEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
};

/**
 * The single primary-action path for the stage. Space (when the stage, not a
 * control, holds focus) and — in paw mode — an empty-stage touch both call the
 * same `onPrimaryAction`, but only while `canAct` is true. `preventDefault` runs
 * only for an eligible Space press so page scrolling is blocked exactly then.
 */
export function useLottoControls({
  canAct,
  onPrimaryAction,
  pawMode,
}: LottoControlsOptions): { stageProps: StageProps } {
  function onKeyDown(event: KeyboardEvent): void {
    if (!isSpaceKey(event.key)) {
      return;
    }
    if (!canAct || startedOnControl(event.target)) {
      return;
    }
    event.preventDefault();
    onPrimaryAction();
  }

  function onPointerUp(event: PointerEvent): void {
    if (!pawMode || !canAct) {
      return;
    }
    if (event.pointerType !== 'touch') {
      return;
    }
    if (startedOnControl(event.target)) {
      return;
    }
    onPrimaryAction();
  }

  return { stageProps: { onKeyDown, onPointerUp } };
}
