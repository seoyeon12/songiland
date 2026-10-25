import { useEffect, useRef } from 'react';
import type { PendingChoice } from '../engine';

export type ChoiceDialogProps = {
  pending: PendingChoice;
  /** 자동 결정이 곧 고를 예정이면 안내를 보여 준다. */
  autoDeciding: boolean;
  onChoose: (choiceId: string) => void;
};

/** 선택 카드. 뜨는 동안 시간은 멈춘다. */
export function ChoiceDialog({ pending, autoDeciding, onChoose }: ChoiceDialogProps) {
  const firstButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstButton.current?.focus();
  }, [pending.eventId, pending.month]);

  return (
    <div className="choice__backdrop">
      <div
        className={`choice choice--${pending.tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="choice-text"
      >
        <p className="choice__kicker">선택의 순간</p>
        <p id="choice-text" className="choice__text">
          {pending.text}
        </p>
        <div className="choice__options">
          {pending.choices.map((choice, index) => (
            <button
              key={choice.id}
              ref={index === 0 ? firstButton : undefined}
              type="button"
              className="btn choice__option"
              onClick={() => onChoose(choice.id)}
            >
              {choice.label}
            </button>
          ))}
        </div>
        {autoDeciding && <p className="choice__auto">자동 결정이 켜져 있어 곧 골라요.</p>}
        {pending.alwaysAsk && (
          <p className="choice__auto">이 선택은 자동 결정이 켜져 있어도 직접 정해요.</p>
        )}
      </div>
    </div>
  );
}
