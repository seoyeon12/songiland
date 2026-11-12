import type { HTMLAttributes } from 'react';
import { FILLINGS, type ShopConfig } from '../engine';
import { rackGrade, type RackItem } from '../game/session';
import { BbangFish } from './BbangFish';
import { GRADE_LABEL, gradeColor } from './gradeColor';

/** 거치대 한 칸의 붕어빵. 등급 색·라벨과 식어 가는 온기 막대를 보여 준다. 끌어서 손님·휴지통에 놓는다. */
export function FishItem({
  item,
  shop,
  elapsedMs,
  disabled,
  selected,
  dragging,
  handlers,
}: {
  item: RackItem;
  shop: ShopConfig;
  elapsedMs: number;
  disabled: boolean;
  /** 눌러서 고른 상태(다음에 누른 손님·휴지통으로 간다). */
  selected: boolean;
  /** 지금 끌고 있는 붕어빵이면 자리를 흐리게 둔다. */
  dragging: boolean;
  handlers: Pick<
    HTMLAttributes<HTMLButtonElement>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onClick'
  >;
}) {
  const grade = rackGrade(item, elapsedMs, shop);
  const held = elapsedMs - item.rackedAtMs;
  const cooling = grade === 'perfect' || grade === 'good';
  const warmth = cooling ? 1 - (held % shop.coolStepMs) / shop.coolStepMs : 0;
  const classes = [
    'rack__item',
    `rack__item--${grade}`,
    selected ? 'rack__item--on' : '',
    dragging ? 'rack__item--dragging' : '',
  ].join(' ');
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${FILLINGS[item.filling].label} ${GRADE_LABEL[grade]} 고르기`}
      {...handlers}
    >
      <BbangFish className="rack__fish" fill={gradeColor(grade)} />
      <span className="rack__label">
        {FILLINGS[item.filling].emoji} {GRADE_LABEL[grade]}
      </span>
      <span className="rack__warmth" aria-hidden="true">
        <span className="rack__warmth-fill" style={{ width: `${warmth * 100}%` }} />
      </span>
    </button>
  );
}
