import type { DrawPhase } from '../domain/types';

export type LottoControlsProps = {
  phase: DrawPhase;
  revealedCount: number;
  onPrimaryAction: () => void;
  disabled?: boolean;
  /** Paw mode is offered only at the mobile breakpoint. */
  pawAvailable?: boolean;
  pawEnabled?: boolean;
  onTogglePaw?: (next: boolean) => void;
};

const MAIN_COUNT = 6;

/**
 * The single primary control. It renders a real <button> and shares one
 * callback with click, Space, and paw-mode taps. On mobile it also exposes the
 * 발바닥 모드 toggle that enables the empty-stage-touch reveal path.
 */
export function LottoControls({
  phase,
  revealedCount,
  onPrimaryAction,
  disabled = false,
  pawAvailable = false,
  pawEnabled = false,
  onTogglePaw,
}: LottoControlsProps) {
  const pawToggle =
    pawAvailable && onTogglePaw ? (
      <button
        type="button"
        className="btn btn--ghost"
        aria-pressed={pawEnabled}
        onClick={() => onTogglePaw(!pawEnabled)}
        data-lotto-control
      >
        {pawEnabled ? '발바닥 모드 OFF' : '발바닥 모드 ON'}
      </button>
    ) : null;

  if (phase === 'complete') {
    return pawToggle ? <div className="lotto-controls">{pawToggle}</div> : null;
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
      {pawToggle}
    </div>
  );
}
