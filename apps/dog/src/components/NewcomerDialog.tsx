import { useEffect, useId, useRef, useState } from 'react';
import { useAutoDecide } from '../app/useRunClock';
import type { PendingMeeting } from '../engine';
import { MeetingCard } from './MeetingCard';
import { NameForm } from './NameForm';

export type NewcomerDialogProps = {
  pending: PendingMeeting;
  /** 새 식구를 들이게 된 아이 이름 */
  hostName: string;
  /** 가족 중에 이미 있는 이름 */
  taken: readonly string[];
  /** 켜져 있으면 잠시 뒤 첫 추천 이름으로 정한다. 이름을 고르거나 입력하면 기다린다. */
  autoDeciding: boolean;
  delayMs: number;
  onWelcome: (name: string) => void;
  onAuto: () => void;
};

/** 새 식구 카드. 이름을 지으면 가족이 된다. 뜨는 동안 시간은 멈춘다. */
export function NewcomerDialog({
  pending,
  hostName,
  taken,
  autoDeciding,
  delayMs,
  onWelcome,
  onAuto,
}: NewcomerDialogProps) {
  const [edited, setEdited] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const waiting = autoDeciding && !edited;

  useEffect(() => {
    dialog.current?.focus();
  }, [pending.month]);
  useAutoDecide({ active: waiting, delayMs, onDecide: onAuto });

  return (
    <div className="choice__backdrop">
      <div
        ref={dialog}
        className="choice newcomer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <p className="choice__kicker">{hostName}네 새 식구</p>
        <MeetingCard meeting={pending.meeting} titleId={titleId} heading="h2" />
        <NameForm
          suggestions={pending.meeting.suggestedNames}
          taken={taken}
          onEdit={() => setEdited(true)}
          onSubmit={onWelcome}
        />
        {waiting && (
          <p className="choice__auto">
            자동 결정이 켜져 있어 곧 추천 이름으로 정해요. 이름을 고르거나 입력하면 기다릴게요.
          </p>
        )}
      </div>
    </div>
  );
}
