import type { CSSProperties } from 'react';
import type { LottoNumbers } from '../domain/types';

export type NumberBoardProps = {
  /** 아직 뽑지 않았으면 null. */
  numbers: LottoNumbers | null;
  /** 뽑을 때마다 바뀌는 값. 공을 다시 마운트해 등장 애니메이션을 새로 재생한다. */
  drawKey?: string;
};

const MAIN_SLOTS = 6;

/** 본번호 6개와 보너스 번호 1개. 뽑기 전에는 빈 자리를 보여 준다. */
export function NumberBoard({ numbers, drawKey = 'empty' }: NumberBoardProps) {
  return (
    <div className="board">
      <ol className="board__main" aria-label="본번호 6개">
        {Array.from({ length: MAIN_SLOTS }, (_, index) => {
          const value = numbers?.main[index];
          return value === undefined ? (
            <li
              key={`empty-${index}`}
              className="ball ball--empty"
              aria-label={`본번호 ${index + 1} 빈 자리`}
            />
          ) : (
            <li
              key={`${drawKey}-${index}`}
              className="ball ball--main"
              style={{ '--i': index } as CSSProperties}
              aria-label={`본번호 ${index + 1}: ${value}`}
            >
              {value}
            </li>
          );
        })}
      </ol>

      <span className="board__plus" aria-hidden>
        +
      </span>

      <div className="board__bonus">
        {numbers ? (
          <span
            key={`${drawKey}-bonus`}
            className="ball ball--bonus"
            style={{ '--i': MAIN_SLOTS } as CSSProperties}
            role="img"
            aria-label={`보너스 번호: ${numbers.bonus}`}
          >
            {numbers.bonus}
          </span>
        ) : (
          <span
            className="ball ball--empty ball--bonus-empty"
            role="img"
            aria-label="보너스 번호 빈 자리"
          />
        )}
      </div>
    </div>
  );
}
