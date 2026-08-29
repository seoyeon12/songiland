import type { DrawPhase, DrawPlan } from '../domain/types';

export type GameHudProps = {
  phase: DrawPhase;
  plan: DrawPlan | null;
  revealedCount: number;
};

const ORDINALS = ['첫', '두', '세', '네', '다섯', '여섯'];
const MAIN_COUNT = 6;

function statusCopy(phase: DrawPhase, revealedCount: number): string {
  switch (phase) {
    case 'idle':
      return '송이야, 오늘의 행운을 골라줘!';
    case 'mixing':
      return '송이가 공을 열심히 섞는 중…';
    case 'complete':
      return '송이가 골라준 오늘의 행운!';
    default:
      if (revealedCount >= MAIN_COUNT) {
        return '보너스 공은 마지막 한 번 더!';
      }
      return `${ORDINALS[revealedCount]} 번째 행운번호를 뽑아볼까?`;
  }
}

export function GameHud({ phase, plan, revealedCount }: GameHudProps) {
  return (
    <header className="game-hud">
      <h1 className="game-hud__title">송이의 행운 로또쇼</h1>
      <p className="game-hud__status" aria-live="polite">
        {statusCopy(phase, revealedCount)}
      </p>

      <ul className="game-hud__slots" aria-label="본번호 슬롯 6개">
        {Array.from({ length: MAIN_COUNT }, (_, index) => {
          const revealed = revealedCount > index && plan !== null;
          return (
            <li
              key={`slot-${index}`}
              className={`slot slot--main${revealed ? ' slot--filled' : ''}`}
              aria-label={
                revealed ? `공개된 본번호 ${index + 1}` : `본번호 슬롯 ${index + 1}`
              }
            >
              {revealed ? <span>{plan.main[index]}</span> : null}
            </li>
          );
        })}
      </ul>

      <div className="game-hud__bonus">
        {(() => {
          const revealed = revealedCount >= MAIN_COUNT + 1 && plan !== null;
          return (
            <div
              className={`slot slot--bonus${revealed ? ' slot--filled' : ''}`}
              aria-label={revealed ? '공개된 보너스 번호' : '보너스 슬롯'}
            >
              {revealed ? <span>{plan.bonus}</span> : null}
            </div>
          );
        })()}
      </div>
    </header>
  );
}
