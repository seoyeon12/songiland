import { useEffect, useReducer, useRef, useState } from 'react';
import { comboMultiplier, FILLINGS, type ShopConfig } from '../engine';
import { BbangFish } from '../components/BbangFish';
import { FillingPicker } from '../components/FillingPicker';
import { GRADE_LABEL, gradeColor } from '../components/gradeColor';
import { OrderQueue } from '../components/OrderQueue';
import { Pan } from '../components/Pan';
import { Rack } from '../components/Rack';
import { useRackDrag } from '../components/useRackDrag';
import { actionForKey, ORDER_KEYS, PAN_KEYS } from '../game/hotkeys';
import { scoreAt, type ScorePoint } from '../game/replay';
import {
  createSession,
  packFor,
  panDoneness,
  rackGrade,
  reduce,
  type Notice,
  START_LIVES,
  type SessionState,
} from '../game/session';
import { TUTORIAL_STEPS, tutorialStep } from '../game/tutorial';
import { useShiftClock } from '../game/useShiftClock';

function noticeText(notice: Notice): string {
  switch (notice.kind) {
    case 'served': {
      const count = notice.count > 1 ? `${notice.count}개 ` : '';
      return notice.grade === 'perfect'
        ? `🛍️ ${count}완벽!${notice.multiplier > 1 ? ` 콤보 ×${notice.multiplier}` : ''}`
        : `🛍️ ${count}${GRADE_LABEL[notice.grade]}`;
    }
    case 'mismatch':
      return '주문한 소가 아니에요';
    case 'none-ready':
      return `거치대에 ${FILLINGS[notice.filling].label} 붕어빵이 없어요`;
    case 'burnt':
      return '탔어요… ♥ −1';
    case 'missed':
      return `손님이 떠났어요… ♥ −${notice.count}`;
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

/** 지금 해야 할 일 한 줄. 손님에게 줄 수 있으면 그게 먼저, 다음은 꺼내기, 그다음 붓기. */
function nextStep(state: SessionState): string {
  const { shop, elapsedMs } = state;
  if (state.orders.some((order) => packFor(order, state.rack, elapsedMs, shop).length > 0)) {
    return '👆 반짝이는 손님을 누르면 봉투에 담아 드려요';
  }
  const pans = state.pans.filter((pan) => pan.status === 'cooking');
  if (pans.some((pan) => panDoneness(pan, elapsedMs, shop) !== 'raw')) {
    return '👇 다 익은 틀을 눌러 꺼내요';
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
 * 위에서부터 손님 → 봉투 → 거치대 → 틀 순서라, 틀에서 꺼낸 붕어빵이 위로 올라가며 손님에게 간다.
 */
export function PlayScreen({
  shift,
  shop,
  ghost,
  practice = false,
  onEnd,
  onQuit,
}: {
  shift: SessionState['shift'];
  /** 튜토리얼(연습 판): 손님이 안 떠나고 목숨이 안 줄며, 단계별 안내를 띄운다. */
  practice?: boolean;
  /** 가게 설정. 오늘의 장사는 표준 가게. */
  shop: ShopConfig;
  /** 오늘 최고 기록 판의 점수 흐름(없으면 null). */
  ghost: readonly ScorePoint[] | null;
  onEnd: (state: SessionState) => void;
  /** 튜토리얼에서 나가기(연습 판에서만 보인다). */
  onQuit?: () => void;
}) {
  const [state, dispatch] = useReducer(reduce, null, () => createSession(shift, shop, { practice }));
  const endedRef = useRef(false);
  // 거치대에서 눌러 고른 붕어빵(화면 상태라 입력 로그에 남기지 않는다). 거치대에서 사라지면 풀린다.
  const [picked, setPicked] = useState<number | null>(null);
  const selected = state.rack.some((item) => item.id === picked) ? picked : null;
  const toggle = (itemId: number) => setPicked((current) => (current === itemId ? null : itemId));

  const { drag, bind } = useRackDrag(toggle, (itemId, target) => {
    setPicked(null);
    dispatch(
      target.kind === 'trash'
        ? { type: 'discard', itemId }
        : { type: 'give', itemId, orderId: target.orderId },
    );
  });

  const live = useRef({ state, selected, onQuit });
  useEffect(() => {
    live.current = { state, selected, onQuit };
  });

  // 키보드 단축키(물리 키 기준이라 한글 입력 상태에서도 먹는다). 튜토리얼은 Esc로 나간다.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const { state: current, selected: held, onQuit: quit } = live.current;
      if (event.code === 'Escape') {
        if (held !== null) {
          setPicked(null);
        } else {
          quit?.();
        }
        return;
      }
      const action = actionForKey(event.code, current, held);
      if (!action) {
        return;
      }
      event.preventDefault();
      if (action.type === 'select') {
        setPicked(action.itemId);
      } else {
        setPicked(null);
        dispatch(action.input);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useShiftClock(shift.durationMs, !state.over, (nowMs) => dispatch({ type: 'tick', nowMs }));

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
  const heldId = drag?.itemId ?? selected;
  const heldItem = state.rack.find((item) => item.id === heldId) ?? null;
  const dragItem = drag ? (state.rack.find((item) => item.id === drag.itemId) ?? null) : null;
  const lead = ghostScore === null ? 0 : score - ghostScore;

  return (
    <div className="app">
      <main className="app__main play">
        <header className="play__hud">
          {practice ? (
            <span className="play__practice">
              🎓 튜토리얼
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
            <span className="play__score">{score.toLocaleString('ko-KR')}점</span>
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
            손님 <span className="station__hint">누르면 봉투에 담아 건네요 · 붕어빵을 끌어 놓아도 돼요</span>
          </h2>
          <OrderQueue
            orders={state.orders}
            elapsedMs={state.elapsedMs}
            rack={state.rack}
            shop={state.shop}
            disabled={state.over}
            hotkeys={ORDER_KEYS}
            heldFilling={heldItem?.filling ?? null}
            overOrderId={drag?.over?.kind === 'order' ? drag.over.orderId : null}
            onServe={(orderId) => {
              setPicked(null);
              dispatch(
                selected === null
                  ? { type: 'serve', orderId }
                  : { type: 'give', itemId: selected, orderId },
              );
            }}
          />
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
            <span className="station__keys" aria-hidden="true">
              <kbd>Z</kbd> <kbd>←</kbd>
              <kbd>→</kbd>
            </span>{' '}
            <span className="station__hint">
              {selected === null
                ? '끌어서 손님에게 · 휴지통에 놓으면 버려요'
                : '골랐어요! 손님이나 휴지통을 눌러요'}
            </span>
          </h2>
          <Rack
            rack={state.rack}
            shop={state.shop}
            elapsedMs={state.elapsedMs}
            disabled={state.over}
            selected={selected}
            drag={drag}
            bind={bind}
            onTrash={() => {
              if (selected !== null) {
                setPicked(null);
                dispatch({ type: 'discard', itemId: selected });
              }
            }}
          />
        </section>

        <section className="station" aria-labelledby="pans-title">
          <h2 id="pans-title" className="station__title">
            화로 <span className="station__hint">빈 틀 → 반죽 붓기 · 초록일 때 → 꺼내기</span>
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
              />
            ))}
          </div>
          <FillingPicker
            selected={state.selected}
            elapsedMs={state.elapsedMs}
            durationMs={shift.durationMs}
            onSelect={(filling) => dispatch({ type: 'select', filling })}
          />
        </section>

        {drag && dragItem && (
          <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
            <BbangFish
              className="drag-ghost__fish"
              fill={gradeColor(rackGrade(dragItem, state.elapsedMs, state.shop))}
            />
          </div>
        )}

        {state.notice && (
          <p
            key={state.notice.seq}
            className={`flash flash--${noticeTone(state.notice)}`}
            role="status"
          >
            {noticeText(state.notice)}
          </p>
        )}
        <p className="play__keys">
          ⌨️ 단축키 · <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd> 소 · <kbd>Q</kbd>~<kbd>R</kbd> 틀 · <kbd>A</kbd>~<kbd>F</kbd> 손님 ·{' '}
          <kbd>Z</kbd>
          <kbd>←</kbd>
          <kbd>→</kbd> 거치대 고르기 · <kbd>Del</kbd> 버리기 · <kbd>Esc</kbd> 취소
        </p>
      </main>
    </div>
  );
}

/** 튜토리얼 단계 안내. 지금 단계를 크게, 끝낸 단계는 체크로 보여 준다. */
function Coach({ state }: { state: SessionState }) {
  const current = tutorialStep(state);
  return (
    <ol className="coach" aria-label="튜토리얼 단계">
      {TUTORIAL_STEPS.map((step, index) => (
        <li
          key={step.title}
          className={`coach__step ${index < current ? 'coach__step--done' : ''} ${index === current ? 'coach__step--now' : ''}`}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="coach__mark" aria-hidden="true">
            {index < current ? '✓' : index + 1}
          </span>
          {step.title}
        </li>
      ))}
    </ol>
  );
}
