import { EntertainmentNotice } from './EntertainmentNotice';

export type ResultCardProps = {
  mainNumbers: number[];
  bonusNumber: number;
  drawnAt: string;
  onRestart: () => void;
  onOpenHistory: () => void;
};

const BONUS_NOTICE =
  '보너스 번호는 게임쇼 연출이에요. 실제 구매 번호는 본번호 6개뿐!';

function formatDrawnAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ResultCard({
  mainNumbers,
  bonusNumber,
  drawnAt,
  onRestart,
  onOpenHistory,
}: ResultCardProps) {
  const sortedMain = [...mainNumbers].sort((a, b) => a - b);
  return (
    <section className="result-card" aria-labelledby="result-card-title">
      <h2 id="result-card-title" className="result-card__title">
        오늘의 송이 픽!
      </h2>
      <p className="result-card__time">추첨 시각 · {formatDrawnAt(drawnAt)}</p>

      <ul className="result-card__balls" aria-label="추천 본번호 6개">
        {sortedMain.map((number, index) => (
          <li
            key={`main-${index}`}
            className="ball ball--main"
            aria-label={`본번호 ${number}`}
          >
            <span>{number}</span>
          </li>
        ))}
      </ul>

      <div className="result-card__bonus">
        <ul aria-label="연출용 보너스 번호">
          <li className="ball ball--bonus" aria-label={`보너스 번호 ${bonusNumber}`}>
            <span>{bonusNumber}</span>
          </li>
        </ul>
        <p className="result-card__bonus-note">{BONUS_NOTICE}</p>
      </div>

      <div className="result-card__actions">
        <button type="button" className="btn btn--primary" onClick={onRestart}>
          한 번 더 뽑기
        </button>
        <button type="button" className="btn" onClick={onOpenHistory}>
          최근 행운 기록 보기
        </button>
      </div>

      <EntertainmentNotice />
    </section>
  );
}
