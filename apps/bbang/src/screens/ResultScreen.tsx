import { pointsFor, type ServedGrade } from '../engine';
import type { RecordResult } from '../app/storage';
import { GRADE_LABEL } from '../components/gradeColor';
import type { SessionState } from '../game/session';

const SERVED_GRADES: readonly ServedGrade[] = ['perfect', 'good', 'cold'];

/** 결과 화면: 점수·판정 집계와 오늘 최고 기록 비교. (공유 카드 PNG는 4단계) */
export function ResultScreen({
  state,
  label,
  record,
  points,
  onAgain,
  onHome,
}: {
  state: SessionState;
  /** "오늘의 장사 · 2026-11-08" 또는 "내 가게" */
  label: string;
  record: RecordResult;
  /** 이번 판을 더한 뒤 보유 포인트. */
  points: number;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { tally } = state;
  const { previousBest, isNewBest } = record;
  const diff = previousBest === null ? null : tally.score - previousBest;
  const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;
  const earned = pointsFor(state.revenue, state.cost);

  return (
    <div className="app">
      <main className="app__main">
        <section className="app__card result" aria-labelledby="result-title">
          <p className="app__subtitle">{label}</p>
          <h1 id="result-title" className="app__title">
            장사 끝!
          </h1>
          <p className="result__score">{tally.score.toLocaleString('ko-KR')}점</p>
          {isNewBest ? (
            <p className="result__best result__best--new">
              🎉 {previousBest === null ? '첫 기록!' : `최고 기록 경신! (+${diff!.toLocaleString('ko-KR')})`}
            </p>
          ) : (
            <p className="result__best">
              최고 기록 {previousBest!.toLocaleString('ko-KR')}점 · {Math.abs(diff!).toLocaleString('ko-KR')}점
              모자라요
            </p>
          )}
          <p className="result__combo">최고 콤보 {tally.bestStreak}연속</p>

          <dl className="result__grades">
            {SERVED_GRADES.map((grade) => (
              <div key={grade}>
                <dt>{GRADE_LABEL[grade]}</dt>
                <dd>{tally.counts[grade]}</dd>
              </div>
            ))}
            <div>
              <dt>탐</dt>
              <dd>{state.burnt}</dd>
            </div>
          </dl>

          <p className="result__meta">
            판 붕어빵 {tally.served}개 · 버림 {state.discarded}개 · 놓친 손님 {state.missedOrders}팀
            <br />
            소 틀림 {tally.mismatches}번 · 탄 걸 냄 {tally.burntServes}번
          </p>

          <dl className="receipt" aria-label="오늘의 영수증">
            <div>
              <dt>매출</dt>
              <dd>{won(state.revenue)}</dd>
            </div>
            <div>
              <dt>재료비</dt>
              <dd>−{won(state.cost)}</dd>
            </div>
            <div className="receipt__total">
              <dt>순이익</dt>
              <dd>{won(Math.max(0, state.revenue - state.cost))}</dd>
            </div>
            <div className="receipt__points">
              <dt>포인트</dt>
              <dd>
                +{earned.toLocaleString('ko-KR')}P{' '}
                <span className="receipt__wallet">(보유 {points.toLocaleString('ko-KR')}P)</span>
              </dd>
            </div>
          </dl>

          <div className="result__actions">
            <button type="button" className="btn btn--primary btn--large" onClick={onAgain}>
              다시 도전
            </button>
            <button type="button" className="btn" onClick={onHome}>
              처음으로
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
