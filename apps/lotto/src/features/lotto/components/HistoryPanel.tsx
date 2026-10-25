import { useEffect, useRef, useState } from 'react';
import type { DrawRecord } from '../history/types';

export type HistoryPanelProps = {
  isOpen: boolean;
  records: DrawRecord[];
  onClose: () => void;
  onClear: () => void;
};

function formatDrawnAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function HistoryPanel({
  isOpen,
  records,
  onClose,
  onClear,
}: HistoryPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // Remember the opener so focus returns there on close.
    openerRef.current = document.activeElement;
    headingRef.current?.focus();
    return () => {
      setConfirming(false);
      if (openerRef.current instanceof HTMLElement) {
        openerRef.current.focus();
      }
    };
  }, [isOpen]);

  // Closed: render nothing so we trap neither focus nor scroll.
  if (!isOpen) {
    return null;
  }

  const sorted = [...records].sort(
    (a, b) => Date.parse(b.drawnAt) - Date.parse(a.drawnAt),
  );

  return (
    <aside
      className="history-panel"
      aria-labelledby="history-panel-title"
      data-lotto-control
    >
      <div className="history-panel__header">
        <h2
          id="history-panel-title"
          className="history-panel__title"
          tabIndex={-1}
          ref={headingRef}
        >
          최근 24시간의 행운 기록 · {records.length}/20
        </h2>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onClose}
          aria-label="기록 패널 닫기"
        >
          닫기
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="history-panel__empty">송이와 첫 번째 행운번호를 뽑아볼까?</p>
      ) : (
        <>
          <ol className="history-panel__list">
            {sorted.map((entry) => (
              <li key={entry.id} className="history-panel__item">
                <time dateTime={entry.drawnAt}>{formatDrawnAt(entry.drawnAt)}</time>
                <span className="history-panel__numbers">
                  {[...entry.mainNumbers].sort((a, b) => a - b).join(', ')}
                  {' + '}
                  <strong>{entry.bonusNumber}</strong>
                </span>
              </li>
            ))}
          </ol>

          <p className="history-panel__privacy">
            추천 기록은 이 브라우저에만 최대 24시간 저장되며 송이랜드 서버로
            전송되지 않습니다. 브라우저 데이터 삭제·시크릿 모드·다른 기기에서는
            기록이 유지되지 않을 수 있습니다.
          </p>

          <button
            type="button"
            className="btn btn--small btn--danger-outline history-panel__clear"
            onClick={() => setConfirming(true)}
          >
            기록 모두 지우기
          </button>
        </>
      )}

      {confirming && (
        <div
          className="history-panel__confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-confirm-title"
        >
          <div className="history-panel__dialog">
            <h3 id="history-confirm-title">기록을 모두 지울까요?</h3>
            <div className="history-panel__confirm-actions">
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  onClear();
                  setConfirming(false);
                }}
              >
                지우기
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirming(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
