import type { DailyBest } from '../app/storage';

/** 오늘의 장사(랭킹, 표준 가게) · 내 가게(무작위 장사, 업그레이드 적용). */
export type StartMode = 'daily' | 'own';

/** 시작 화면: 오늘의 장사(오늘 내 최고 기록), 내 가게 영업, 상점. */
export function StartScreen({
  day,
  dailyBest,
  ownBest,
  points,
  persistence,
  onStart,
  onShop,
}: {
  /** 'YYYY-MM-DD'(UTC) */
  day: string;
  dailyBest: DailyBest | null;
  ownBest: number | null;
  /** 보유 포인트. */
  points: number;
  persistence: 'local' | 'memory';
  onStart: (mode: StartMode) => void;
  onShop: () => void;
}) {
  return (
    <div className="app">
      <main className="app__main">
        <section className="app__card start" aria-labelledby="start-title">
          <p className="app__subtitle">겨울 길거리 붕어빵 가게</p>
          <h1 id="start-title" className="app__title">
            붕어빵 랭킹전
          </h1>
          <p className="start__lead">
            손님 주문대로 붕어빵을 <strong>제 타이밍에</strong> 구워 내세요. 90초 장사 한 판!
          </p>
          <ul className="start__how">
            <li>소를 고르고 빈 틀에 반죽을 부어요. 한번 부으면 뺄 수 없어요.</li>
            <li>
              게이지가 <strong>초록 구간</strong>일 때 꺼내면 완벽! 늦으면 타요.
            </li>
            <li>거치대에서 붕어빵을 골라 주문 카드를 누르면 서빙. 탄 건 🗑️에 버려요.</li>
            <li>거치대에 오래 두면 식어요. 완벽을 이어 내면 콤보!</li>
            <li>번 돈(순이익)은 포인트가 되고, 상점에서 내 가게를 키워요.</li>
          </ul>

          <div className="start__record">
            <span>오늘 내 최고</span>
            <strong>
              {dailyBest ? `${dailyBest.score.toLocaleString('ko-KR')}점` : '아직 없음'}
            </strong>
            {dailyBest && <span className="start__ghost">👻 고스트와 함께 달려요</span>}
          </div>

          <div className="start__actions">
            <button type="button" className="btn btn--primary btn--large" onClick={() => onStart('daily')}>
              오늘의 장사 시작
            </button>
            <button type="button" className="btn" onClick={() => onStart('own')}>
              내 가게 영업{ownBest !== null ? ` · 최고 ${ownBest.toLocaleString('ko-KR')}점` : ''}
            </button>
            <button type="button" className="btn" onClick={onShop}>
              🛒 상점 · {points.toLocaleString('ko-KR')}P
            </button>
          </div>
          <p className="start__daily">
            오늘의 장사 · {day} (UTC) · 전 세계 같은 판 · 모두 같은 기본 가게
          </p>
          {persistence === 'memory' && (
            <p className="start__warn" role="note">
              이 브라우저에서는 저장이 막혀 있어 기록이 유지되지 않을 수 있어요.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
