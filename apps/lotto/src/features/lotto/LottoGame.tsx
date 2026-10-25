import { appUrl } from '@songiland/catalog';
import { useState } from 'react';
import './components/lotto.css';
import { EntertainmentNotice } from './components/EntertainmentNotice';
import { HistoryPanel } from './components/HistoryPanel';
import { NumberBoard } from './components/NumberBoard';
import { drawNumbers } from './domain/numbers';
import type { LottoNumbers, RandomInt } from './domain/types';
import { createHistoryRepository } from './history/historyRepository';
import type { DrawHistoryRepository, DrawRecord } from './history/types';
import { useSpaceToDraw } from './input/useSpaceToDraw';

export type LottoGameProps = {
  /** Test seam only; production uses the Web Crypto generator. */
  random?: RandomInt;
  /** Test seam only; production uses the browser repository. */
  historyRepository?: DrawHistoryRepository;
};

type CurrentDraw = {
  id: string;
  drawnAt: string;
  numbers: LottoNumbers;
};

// 법적 검토에서 정한 6본번호 고지. 번호가 보이는 동안 함께 보여 준다.
const BONUS_NOTICE =
  '보너스 번호는 게임쇼 연출이에요. 실제 구매 번호는 본번호 6개뿐!';

// 로컬 dev 서버에서는 포털 dev 서버로, 배포본에서는 songiland.arosys.kr로 돌아간다.
const PORTAL_URL = appUrl('portal', import.meta.env.DEV ? 'local' : 'production');

function newRecordId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draw-${Date.now()}`;
}

function formatDrawnAt(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/**
 * 송이의 행운 로또쇼. Space 또는 버튼 한 번에 본번호 6개와 보너스 1개를 뽑아
 * 바로 보여 주고, 뽑을 때마다 기록을 1건 저장한다.
 */
export function LottoGame({ random, historyRepository }: LottoGameProps) {
  // Stable per-mount instance without touching a ref during render.
  const [repository] = useState<DrawHistoryRepository>(
    () => historyRepository ?? createHistoryRepository(),
  );
  const [current, setCurrent] = useState<CurrentDraw | null>(null);
  const [history, setHistory] = useState<DrawRecord[]>(() =>
    repository.list(new Date()),
  );
  const [historyOpen, setHistoryOpen] = useState(false);

  function draw() {
    const now = new Date();
    const numbers = drawNumbers(random);
    const record: DrawRecord = {
      id: newRecordId(),
      drawnAt: now.toISOString(),
      mainNumbers: numbers.main,
      bonusNumber: numbers.bonus,
    };
    repository.save(record, now);
    setCurrent({ id: record.id, drawnAt: record.drawnAt, numbers });
    setHistory(repository.list(now));
  }

  useSpaceToDraw({ enabled: !historyOpen, onDraw: draw });

  function openHistory() {
    setHistory(repository.list(new Date()));
    setHistoryOpen(true);
  }

  function clearHistory() {
    repository.clear();
    setHistory([]);
  }

  return (
    <div className="lotto">
      <nav className="lotto__topbar" aria-label="송이랜드">
        <a className="lotto__home" href={PORTAL_URL}>
          <span aria-hidden>←</span> 송이랜드
        </a>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={openHistory}
        >
          최근 기록
        </button>
      </nav>

      <main className="lotto__main">
        <header className="lotto__header">
          <h1 className="lotto__title">송이의 행운 로또쇼</h1>
          <p className="lotto__subtitle">
            1부터 45까지, 송이가 오늘의 번호 6개를 골라 드려요.
          </p>
        </header>

        <section className="lotto__stage" aria-label="추천 번호">
          <NumberBoard numbers={current?.numbers ?? null} drawKey={current?.id} />
          <p className="lotto__meta">
            {current ? `추첨 시각 · ${formatDrawnAt(current.drawnAt)}` : null}
          </p>
          {/* 화면 낭독기에 새 번호를 한 번에 읽어 준다. */}
          <p className="visually-hidden" aria-live="polite">
            {current
              ? `새 번호: ${current.numbers.main.join(', ')}, 보너스 ${current.numbers.bonus}`
              : ''}
          </p>
        </section>

        <div className="lotto__actions">
          <button type="button" className="btn btn--primary btn--draw" onClick={draw}>
            {current ? '다시 뽑기' : '번호 뽑기'}
          </button>
          <p className="lotto__hint">
            <kbd>Space</kbd> 키로도 뽑을 수 있어요
          </p>
        </div>

        {current && <p className="lotto__bonus-note">{BONUS_NOTICE}</p>}

        {repository.persistence === 'memory' && (
          <p className="lotto__storage-warning" role="status">
            이 기기에서는 기록이 유지되지 않을 수 있어요.
          </p>
        )}
      </main>

      <footer className="lotto__footer">
        <EntertainmentNotice />
      </footer>

      <HistoryPanel
        isOpen={historyOpen}
        records={history}
        onClose={() => setHistoryOpen(false)}
        onClear={clearHistory}
      />
    </div>
  );
}
