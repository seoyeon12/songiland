import type { DrawPhase } from '../domain/types';

export type LottoControlsProps = {
  phase: DrawPhase;
  revealedCount: number;
  onPrimaryAction: () => void;
  disabled?: boolean;
};

const MAIN_COUNT = 6;

/**
 * The single primary control. It renders a real <button> and shares one
 * callback with click, Space, and paw-mode taps (wired in Task 7).
 */
export function LottoControls({
  phase,
  revealedCount,
  onPrimaryAction,
  disabled = false,
}: LottoControlsProps) {
  if (phase === 'complete') {
    return null;
  }

  let label: string;
  if (phase === 'idle') {
    label = '🐾 송이의 행운 발도장';
  } else if (revealedCount >= MAIN_COUNT) {
    label = '보너스 공 뽑기 · Space';
  } else {
    label = '다음 공 뽑기 · Space';
  }

  const locked = disabled || phase === 'mixing' || phase === 'revealing';

  return (
    <div className="lotto-controls">
      <button
        type="button"
        className="btn btn--primary btn--paw"
        onClick={onPrimaryAction}
        disabled={locked}
        data-lotto-control
      >
        {label}
      </button>
    </div>
  );
}
