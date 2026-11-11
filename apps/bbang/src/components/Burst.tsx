import type { CSSProperties } from 'react';
import type { Grade } from '../engine';

/** 판정별 세기(8장: 차등). 완벽은 반짝이 8개와 "딱!", 좋음은 그 절반, 탐은 연기만. */
const STYLE: Record<Grade, { bits: number; label: string | null }> = {
  perfect: { bits: 8, label: '딱!' },
  good: { bits: 4, label: null },
  cold: { bits: 0, label: null },
  burnt: { bits: 3, label: null },
};

/** 틀에서 꺼낸 순간의 반짝임/연기. key(seq)가 바뀌면 다시 그려 애니메이션이 처음부터 돈다. */
export function Burst({ grade }: { grade: Grade }) {
  const { bits, label } = STYLE[grade];
  return (
    <span className={`burst burst--${grade}`} aria-hidden="true">
      {Array.from({ length: bits }, (_, index) => (
        <span
          key={index}
          className="burst__bit"
          style={{ '--angle': `${(360 / bits) * index + (grade === 'burnt' ? -90 : 0)}deg` } as CSSProperties}
        />
      ))}
      {label && <span className="burst__label">{label}</span>}
    </span>
  );
}
