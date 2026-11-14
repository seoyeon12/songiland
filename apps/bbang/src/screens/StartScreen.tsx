import type { DailyBest } from '../app/storage';
import { BbangFish } from '../components/BbangFish';
import { gradeColor } from '../components/gradeColor';

/** 오늘의 장사(랭킹, 표준 가게) · 내 가게(무작위 장사, 업그레이드 적용). */
export type StartMode = 'daily' | 'own';

/** 시작 화면: 오늘의 장사(오늘 내 최고 기록), 내 가게 영업, 상점. */
export function StartScreen({
  day,
  dailyBest,
  ownBest,
  points,
  persistence,
  tutorialDone,
  onTutorial,
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
  /** 튜토리얼을 끝낸 적이 있으면 true(처음이면 튜토리얼 버튼을 맨 위에 크게). */
  tutorialDone: boolean;
  onTutorial: () => void;
  onStart: (mode: StartMode) => void;
  onShop: () => void;
}) {
  const best = dailyBest ? `${dailyBest.score.toLocaleString('ko-KR')}점` : '아직 없음';
  return (
    <div className="app">
      <main className="app__main start">
        {/* 1. 한눈에: 무슨 게임인지 */}
        <header className="start__hero">
          <p className="start__eyebrow">겨울 길거리 붕어빵 가게</p>
          <h1 id="start-title" className="start__title">
            붕어빵 랭킹전
          </h1>
          <div className="start__fishes" aria-hidden="true">
            <BbangFish className="start__fish start__fish--side" fill={gradeColor('raw')} />
            <BbangFish className="start__fish" fill={gradeColor('perfect')} />
            <BbangFish className="start__fish start__fish--side" fill={gradeColor('burnt')} />
          </div>
          <p className="start__pitch">
            딱 좋게 구워 손님에게 팔아요.
            <br />
            <strong>90초</strong> 동안 최고 점수에 도전!
          </p>
        </header>

        {/* 2. 하는 법: 세 동작 */}
        <section className="start__how" aria-labelledby="how-title">
          <h2 id="how-title" className="start__section-title">
            이렇게 해요
          </h2>
          <ol className="steps">
            <li className="steps__item">
              <span className="steps__num" aria-hidden="true">
                1
              </span>
              <span className="steps__art" aria-hidden="true">
                <BbangFish className="steps__fish" fill={gradeColor('raw')} />
              </span>
              <strong className="steps__name">반죽 붓기</strong>
              <span className="steps__sub">빈 틀 누르기</span>
            </li>
            <li className="steps__item">
              <span className="steps__num" aria-hidden="true">
                2
              </span>
              <span className="steps__art" aria-hidden="true">
                <span className="steps__gauge">
                  <span className="steps__green" />
                  <span className="steps__marker" />
                </span>
              </span>
              <strong className="steps__name">초록일 때 꺼내기</strong>
              <span className="steps__sub">늦으면 타요</span>
            </li>
            <li className="steps__item">
              <span className="steps__num" aria-hidden="true">
                3
              </span>
              <span className="steps__art" aria-hidden="true">
                <BbangFish className="steps__fish" fill={gradeColor('perfect')} />
                <span className="steps__plus">+100</span>
              </span>
              <strong className="steps__name">손님에게 판매</strong>
              <span className="steps__sub">저절로 건네요</span>
            </li>
          </ol>
        </section>

        {/* 3. 바로 시작 */}
        <section className="start__play" aria-label="시작하기">
          <div className="start__record">
            <span className="start__record-label">오늘 내 최고</span>
            <strong className="start__record-score">{best}</strong>
            {dailyBest && <span className="start__ghost">👻 고스트와 함께 달려요</span>}
          </div>

          <div className="start__actions">
            {!tutorialDone && (
              <button type="button" className="btn btn--primary btn--large" onClick={onTutorial}>
                처음이라면 튜토리얼부터
              </button>
            )}
            <button
              type="button"
              className={`btn ${tutorialDone ? 'btn--primary btn--large' : ''}`}
              onClick={() => onStart('daily')}
            >
              오늘의 장사 시작
            </button>
            <div className="start__row">
              <button type="button" className="btn" onClick={() => onStart('own')}>
                내 가게 영업{ownBest !== null ? ` · 최고 ${ownBest.toLocaleString('ko-KR')}점` : ''}
              </button>
              <button type="button" className="btn" onClick={onShop}>
                상점 · {points.toLocaleString('ko-KR')}P
              </button>
            </div>
            {tutorialDone && (
              <button type="button" className="btn btn--ghost btn--small" onClick={onTutorial}>
                튜토리얼 다시 보기
              </button>
            )}
          </div>
          {persistence === 'memory' && (
            <p className="start__warn" role="note">
              이 브라우저에서는 저장이 막혀 있어 기록이 유지되지 않을 수 있어요.
            </p>
          )}
        </section>

        {/* 4. 더 알고 싶을 때만: 자세한 규칙은 접어 둔다 */}
        <details className="start__rules">
          <summary>규칙 더 보기</summary>
          <ul>
            <li>
              목숨은 <strong>♥ 5개</strong>. 태우거나 손님이 기다리다 떠나면 하나씩 잃어요.
            </li>
            <li>기다리는 손님이 없으면 거치대에 올라가요. 오래 두면 식고, 누르면 버려요.</li>
            <li>완벽을 이어 내면 콤보! 점수가 커져요.</li>
            <li>번 돈은 포인트가 되고, 상점에서 내 가게를 키워요.</li>
            <li>PC 단축키: 1·2·3 소, Q~R 틀, Z 거치대 맨 앞 버리기.</li>
          </ul>
        </details>
        <p className="start__daily">
          오늘의 장사 · {day} (UTC) · 전 세계 같은 판 · 모두 같은 기본 가게
        </p>
      </main>
    </div>
  );
}
