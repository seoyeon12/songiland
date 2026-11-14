import { useEffect, useReducer, useRef } from 'react';
import { comboMultiplier, FILLINGS, type Grade, type ShopConfig } from '../engine';
import { Burst } from '../components/Burst';
import { FillingPicker } from '../components/FillingPicker';
import { GRADE_LABEL } from '../components/gradeColor';
import { OrderQueue } from '../components/OrderQueue';
import { Pan } from '../components/Pan';
import { Rack } from '../components/Rack';
import { actionForKey, PAN_KEYS } from '../game/hotkeys';
import { scoreAt, type ScorePoint } from '../game/replay';
import {
  createSession,
  panDoneness,
  reduce,
  type Notice,
  START_LIVES,
  type SessionState,
} from '../game/session';
import { TUTORIAL_STEPS, tutorialStep } from '../game/tutorial';
import { useShiftClock } from '../game/useShiftClock';
import { QuitConfirm } from './QuitConfirm';

/** 꺼낸 순간 장사 시간을 멈추는 길이(히트스톱, ms). 완벽은 또렷하게, 좋음은 절반, 탐은 없음. */
const HITSTOP_MS: Record<Grade, number> = { perfect: 90, good: 40, cold: 0, burnt: 0 };

/** Perfect 흰 플래시를 보여 주는 게임 시간(ms). 히트스톱(90ms) 동안 게임 시간이 멈추므로 그보다 조금 길다. */
const FLASH_MS = 60;

/** 점수가 바뀐 알림이면 그 값(숫자 팝용). */
function noticePoints(notice: Notice | null): number | null {
  if (!notice || !('points' in notice) || notice.points === 0) {
    return null;
  }
  return notice.points;
}

function noticeText(notice: Notice): string {
  switch (notice.kind) {
    case 'served': {
      const count = notice.count > 1 ? `${notice.count}개 ` : '';
      return notice.grade === 'perfect'
        ? `🛍️ ${count}완벽!${notice.multiplier > 1 ? ` 콤보 ×${notice.multiplier}` : ''}`
        : `🛍️ ${count}${GRADE_LABEL[notice.grade]}`;
    }
    case 'racked':
      return `🧺 거치대로 · ${FILLINGS[notice.filling].label} 손님 오면 드려요`;
    case 'burnt':
      return '탔어요… ♥ −1';
    case 'missed':
      return `손님이 떠났어요… ♥ −${notice.count} · 콤보 끊김`;
    case 'raw':
      return '아직 덜 익었어요';
    case 'rack-full':
      return '거치대가 꽉 찼어요';
    case 'discarded':
      return '버렸어요';
  }
}

function noticeTone(notice: Notice): string {
  if (notice.kind === 'served') {
    return notice.grade;
  }
  return notice.kind === 'burnt' || notice.kind === 'missed' ? 'bad' : 'info';
}

/** 지금 해야 할 일 한 줄. 꺼내기가 먼저, 그다음 붓기. 거치대가 꽉 차 막혔으면 비우기. */
function nextStep(state: SessionState): string {
  const { shop, elapsedMs } = state;
  const pans = state.pans.filter((pan) => pan.status === 'cooking');
  if (pans.some((pan) => panDoneness(pan, elapsedMs, shop) !== 'raw')) {
    const waiting = pans.some(
      (pan) =>
        panDoneness(pan, elapsedMs, shop) !== 'raw' &&
        !state.orders.some((order) => order.filling === pan.filling),
    );
    return waiting && state.rack.length >= shop.rackSlots
      ? '🗑️ 거치대가 꽉 찼어요 · 붕어빵을 눌러 버려요'
      : '👇 다 익은 틀을 눌러 꺼내요 · 손님에게 바로 가요';
  }
  if (state.pans.some((pan) => pan.status === 'empty')) {
    const wanted = state.orders.find((order) => order.filling !== state.selected);
    return wanted && !state.orders.some((order) => order.filling === state.selected)
      ? `👇 아래에서 ${FILLINGS[wanted.filling].label} 소를 고르고 빈 틀을 눌러요`
      : '👇 빈 틀을 눌러 반죽을 부어요';
  }
  return '⏳ 익을 때까지 잠깐 기다려요';
}

/**
 * 장사(플레이) 화면. 90초 동안 주문을 받아 붕어빵을 구워 낸다.
 * 위에서부터 손님 → 거치대 → 틀 순서라, 틀에서 꺼낸 붕어빵이 위로 올라가며 손님에게 간다.
 * 플레이어는 소 고르기·붓기·꺼내기만 한다. 건네기는 저절로 된다.
 */
export function PlayScreen({
  shift,
  shop,
  ghost,
  practice = false,
  quitAsk = null,
  onEnd,
  onQuit,
}: {
  shift: SessionState['shift'];
  /** 튜토리얼(연습 판): 손님이 안 떠나고 목숨이 안 줄며, 단계별 안내를 띄운다. */
  practice?: boolean;
  /** 그만둘지 묻는 중이면 확인 레이어를 띄우고, 시계를 멈추고 판 입력을 받지 않는다. */
  quitAsk?: { daily: boolean; onContinue: () => void; onQuit: () => void } | null;
  /** 가게 설정. 오늘의 장사는 표준 가게. */
  shop: ShopConfig;
  /** 오늘 최고 기록 판의 점수 흐름(없으면 null). */
  ghost: readonly ScorePoint[] | null;
  onEnd: (state: SessionState) => void;
  /** 나가기(Esc). 튜토리얼은 바로 나가고, 장사는 그만둘지 묻는다. 나가기 버튼은 튜토리얼에만 있다. */
  onQuit?: () => void;
}) {
  const [state, dispatch] = useReducer(reduce, null, () => createSession(shift, shop, { practice }));
  const paused = quitAsk !== null;
  const endedRef = useRef(false);
  const live = useRef({ state, onQuit, paused });
  useEffect(() => {
    live.current = { state, onQuit, paused };
  });

  // 키보드 단축키(물리 키 기준이라 한글 입력 상태에서도 먹는다). Esc는 나가기(장사는 그만둘지 묻는다).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const { state: current, onQuit: quit, paused: asking } = live.current;
      if (asking) {
        return; // 확인 창이 키를 받는다.
      }
      if (event.code === 'Escape') {
        quit?.();
        return;
      }
      const input = actionForKey(event.code, current);
      if (!input) {
        return;
      }
      event.preventDefault();
      dispatch(input);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hitstop = useShiftClock(
    shift.durationMs,
    !state.over,
    (nowMs) => dispatch({ type: 'tick', nowMs }),
    paused,
  );

  // 꺼낸 순간마다 판정 세기만큼 멈칫한다.
  const burst = state.burst;
  useEffect(() => {
    if (burst) {
      hitstop(HITSTOP_MS[burst.grade]);
    }
  }, [burst, hitstop]);

  useEffect(() => {
    if (state.over && !endedRef.current) {
      endedRef.current = true;
      onEnd(state);
    }
  }, [state, onEnd]);

  const remaining = Math.max(0, 1 - state.elapsedMs / shift.durationMs);
  const secondsLeft = Math.ceil((shift.durationMs - state.elapsedMs) / 1000);
  const { score, streak } = state.tally;
  const ghostScore = ghost ? scoreAt(ghost, state.elapsedMs) : null;
  const lead = ghostScore === null ? 0 : score - ghostScore;
  const pop = noticePoints(state.notice);

  return (
    <div className="app">
      <main className="app__main play">
        <header className="play__hud">
          {practice ? (
            <span className="play__practice">
              <span className="play__badge">튜토리얼</span>
              {onQuit && (
                <button type="button" className="btn play__quit" onClick={onQuit}>
                  나가기
                </button>
              )}
            </span>
          ) : (
            <div className="play__timer">
              <span className="play__seconds">{secondsLeft}초</span>
              <span className="play__timebar" aria-hidden="true">
                <span className="play__timebar-fill" style={{ width: `${remaining * 100}%` }} />
              </span>
            </div>
          )}
          <div className="play__scores">
            {!practice && (
              <span className="play__lives" aria-label={`목숨 ${state.lives}개`}>
                {Array.from({ length: START_LIVES }, (_, index) => (
                  <span key={index} className={index < state.lives ? '' : 'play__life--lost'}>
                    ♥
                  </span>
                ))}
              </span>
            )}
            <span className="play__score">
              {score.toLocaleString('ko-KR')}점
              {pop !== null && (
                <span
                  key={state.notice!.seq}
                  className={`score-pop ${pop > 0 ? 'score-pop--plus' : 'score-pop--minus'} ${pop >= 200 ? 'score-pop--big' : ''}`}
                  aria-hidden="true"
                >
                  {pop > 0 ? `+${pop}` : pop}
                </span>
              )}
            </span>
            {streak > 0 && <span className="play__combo">콤보 ×{comboMultiplier(streak)}</span>}
            <span className="play__revenue" aria-label="매출">
              💰 {state.revenue.toLocaleString('ko-KR')}원
            </span>
          </div>
        </header>

        {ghostScore !== null && (
          <p className="ghost" aria-label="오늘 최고 기록과 비교">
            <span className="ghost__label">👻 오늘 최고 기록</span>
            <span className="ghost__score">{ghostScore.toLocaleString('ko-KR')}점</span>
            <span className={`ghost__lead ${lead >= 0 ? 'ghost__lead--ahead' : 'ghost__lead--behind'}`}>
              {lead >= 0 ? `+${lead.toLocaleString('ko-KR')} 앞섬` : `${lead.toLocaleString('ko-KR')} 뒤짐`}
            </span>
          </p>
        )}

        <section className="station" aria-labelledby="orders-title">
          <h2 id="orders-title" className="station__title">
            손님 {practice && <span className="station__hint">꺼내면 그 소 손님에게 바로 가요</span>}
          </h2>
          <OrderQueue orders={state.orders} elapsedMs={state.elapsedMs} />
        </section>

        {practice ? (
          <Coach state={state} />
        ) : (
          <p className="play__step" aria-live="polite">
            {state.over ? '장사 끝!' : nextStep(state)}
          </p>
        )}

        <section className="station" aria-labelledby="rack-title">
          <h2 id="rack-title" className="station__title">
            거치대{' '}
            {practice && <span className="station__hint">손님이 없으면 여기서 기다려요</span>}
          </h2>
          <Rack
            rack={state.rack}
            shop={state.shop}
            elapsedMs={state.elapsedMs}
            disabled={state.over}
            onDiscard={(itemId) => dispatch({ type: 'discard', itemId })}
          />
        </section>

        <section className="station" aria-labelledby="pans-title">
          <h2 id="pans-title" className="station__title">
            화로 {practice && <span className="station__hint">빈 틀 → 붓기 · 초록일 때 → 꺼내기</span>}
          </h2>
          <div className={`pans ${state.pans.length > 4 ? 'pans--wide' : ''}`}>
            {state.pans.map((pan, index) => (
              <Pan
                key={index}
                pan={pan}
                hotkey={PAN_KEYS[index]}
                shop={state.shop}
                elapsedMs={state.elapsedMs}
                disabled={state.over}
                onClick={() =>
                  dispatch(
                    pan.status === 'empty'
                      ? { type: 'pour', panIndex: index }
                      : { type: 'take-out', panIndex: index },
                  )
                }
              >
                {burst?.panIndex === index && <Burst key={burst.seq} grade={burst.grade} />}
              </Pan>
            ))}
          </div>
          <FillingPicker
            selected={state.selected}
            elapsedMs={state.elapsedMs}
            durationMs={shift.durationMs}
            onSelect={(filling) => dispatch({ type: 'select', filling })}
          />
        </section>

        {/* 흰 플래시는 게임 시간으로 잠깐만 그린다(애니메이션이 멈춘 환경에서도 화면을 덮지 않게).
            알림과 같은 부모 아래라 key에 접두어를 붙인다: seq가 같아지면 React가 노드를 겹쳐 쌓는다. */}
        {burst?.grade === 'perfect' && state.elapsedMs - burst.atMs < FLASH_MS && (
          <div key={`flash-${burst.seq}`} className="hitflash" aria-hidden="true" />
        )}

        {state.notice && (
          <p
            key={`notice-${state.notice.seq}`}
            className={`flash flash--${noticeTone(state.notice)}`}
            role="status"
          >
            {noticeText(state.notice)}
          </p>
        )}
        {quitAsk && (
          <QuitConfirm
            daily={quitAsk.daily}
            score={score}
            onContinue={quitAsk.onContinue}
            onQuit={quitAsk.onQuit}
          />
        )}
        <p className="play__keys">
          ⌨️ 단축키 · <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd> 소 · <kbd>Q</kbd>~<kbd>R</kbd> 틀 · <kbd>Z</kbd> 거치대 맨 앞 버리기
          {practice && (
            <>
              {' '}
              · <kbd>Esc</kbd> 나가기
            </>
          )}
        </p>
      </main>
    </div>
  );
}

/** 튜토리얼 단계 안내. 지금 단계를 크게, 끝낸 단계는 체크로 보여 준다. */
function Coach({ state }: { state: SessionState }) {
  const current = tutorialStep(state);
  const total = TUTORIAL_STEPS.length;
  return (
    <div className="coach">
      <p className="coach__progress" aria-hidden="true">
        <span className="coach__count">
          {Math.min(current + 1, total)}/{total}
        </span>
        {TUTORIAL_STEPS.map((step, index) => (
          <span
            key={step.title}
            className={`coach__dot ${index < current ? 'coach__dot--done' : ''} ${index === current ? 'coach__dot--now' : ''}`}
          />
        ))}
      </p>
      <ol className="coach__steps" aria-label="튜토리얼 단계">
        {TUTORIAL_STEPS.map((step, index) => (
          <li
            key={step.title}
            className={
              // 다 끝내면 마지막 단계 글을 그대로 둔다(코치 칸이 비지 않게).
              index === Math.min(current, total - 1) ? 'coach__step' : 'coach__step coach__step--hidden'
            }
            aria-current={index === current ? 'step' : undefined}
          >
            {step.title}
          </li>
        ))}
      </ol>
    </div>
  );
}
