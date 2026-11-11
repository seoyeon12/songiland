import { useEffect, useReducer, useRef } from 'react';
import { comboMultiplier, type Grade, type ShopConfig } from '../engine';
import { Burst } from '../components/Burst';
import { FillingPicker } from '../components/FillingPicker';
import { GRADE_LABEL } from '../components/gradeColor';
import { OrderQueue } from '../components/OrderQueue';
import { Pan } from '../components/Pan';
import { Rack } from '../components/Rack';
import { scoreAt, type ScorePoint } from '../game/replay';
import { createSession, reduce, type Notice, type SessionState } from '../game/session';
import { useShiftClock } from '../game/useShiftClock';

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
    case 'served':
      return notice.grade === 'perfect'
        ? `완벽!${notice.multiplier > 1 ? ` ×${notice.multiplier}` : ''}`
        : GRADE_LABEL[notice.grade];
    case 'mismatch':
      return '주문한 소가 아니에요';
    case 'burnt-serve':
      return '탄 걸 내면 안 돼요!';
    case 'raw':
      return '아직 덜 익었어요';
    case 'rack-full':
      return '거치대가 꽉 찼어요';
    case 'discarded':
      return '버렸어요';
    case 'pick-first':
      return '거치대에서 붕어빵을 먼저 골라요';
    case 'left':
      return '손님이 기다리다 갔어요';
  }
}

function noticeTone(notice: Notice): string {
  if (notice.kind === 'served') {
    return notice.grade;
  }
  return notice.kind === 'mismatch' || notice.kind === 'burnt-serve' || notice.kind === 'left'
    ? 'bad'
    : 'info';
}

/** 장사(플레이) 화면. 90초 동안 주문을 받아 붕어빵을 구워 낸다. */
export function PlayScreen({
  shift,
  shop,
  ghost,
  onEnd,
}: {
  shift: SessionState['shift'];
  /** 가게 설정. 오늘의 장사는 표준 가게. */
  shop: ShopConfig;
  /** 오늘 최고 기록 판의 점수 흐름(없으면 null). */
  ghost: readonly ScorePoint[] | null;
  onEnd: (state: SessionState) => void;
}) {
  const [state, dispatch] = useReducer(reduce, null, () => createSession(shift, shop));
  const endedRef = useRef(false);

  const hitstop = useShiftClock(shift.durationMs, !state.over, (nowMs) =>
    dispatch({ type: 'tick', nowMs }),
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
  const pickedItem = state.rack.find((item) => item.id === state.picked) ?? null;
  const ghostScore = ghost ? scoreAt(ghost, state.elapsedMs) : null;
  const lead = ghostScore === null ? 0 : score - ghostScore;
  const pop = noticePoints(state.notice);

  return (
    <div className="app">
      <main className="app__main play">
        <header className="play__hud">
          <div className="play__timer">
            <span className="play__seconds">{secondsLeft}초</span>
            <span className="play__timebar" aria-hidden="true">
              <span className="play__timebar-fill" style={{ width: `${remaining * 100}%` }} />
            </span>
          </div>
          <div className="play__scores">
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

        <OrderQueue
          orders={state.orders}
          elapsedMs={state.elapsedMs}
          pickedFilling={pickedItem?.filling ?? null}
          disabled={state.over}
          onServe={(orderId) => dispatch({ type: 'serve', orderId })}
        />

        <div className={`pans ${state.pans.length > 4 ? 'pans--wide' : ''}`}>
          {state.pans.map((pan, index) => (
            <Pan
              key={index}
              pan={pan}
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

        <Rack
          rack={state.rack}
          shop={state.shop}
          picked={state.picked}
          elapsedMs={state.elapsedMs}
          disabled={state.over}
          onPick={(itemId) => dispatch({ type: 'pick', itemId })}
          onDiscard={() => dispatch({ type: 'discard' })}
        />

        <FillingPicker
          selected={state.selected}
          elapsedMs={state.elapsedMs}
          durationMs={shift.durationMs}
          onSelect={(filling) => dispatch({ type: 'select', filling })}
        />

        {/* 흰 플래시는 게임 시간으로 잠깐만 그린다(애니메이션이 멈춘 환경에서도 화면을 덮지 않게). */}
        {burst?.grade === 'perfect' && state.elapsedMs - burst.atMs < FLASH_MS && (
          <div key={burst.seq} className="hitflash" aria-hidden="true" />
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
      </main>
    </div>
  );
}
