import { FILLINGS, type ShopConfig } from '../engine';
import { rackGrade, type RackItem } from '../game/session';
import { BbangFish } from './BbangFish';
import { GRADE_LABEL, gradeColor } from './gradeColor';
import { Icon } from './Icon';
import { FILLING_ICON } from './icons';

/** 거치대 한 칸의 붕어빵. 등급 색·라벨과 식어 가는 온기 막대를 보여 준다. 누르면 버린다. */
export function FishItem({
  item,
  shop,
  elapsedMs,
  disabled,
  onDiscard,
}: {
  item: RackItem;
  shop: ShopConfig;
  elapsedMs: number;
  disabled: boolean;
  onDiscard: () => void;
}) {
  const grade = rackGrade(item, elapsedMs, shop);
  const held = elapsedMs - item.rackedAtMs;
  const cooling = grade === 'perfect' || grade === 'good';
  const warmth = cooling ? 1 - (held % shop.coolStepMs) / shop.coolStepMs : 0;
  const label = FILLINGS[item.filling].label;
  return (
    <button
      type="button"
      className={`rack__item rack__item--${grade}`}
      disabled={disabled}
      onClick={onDiscard}
      aria-label={`${label} ${GRADE_LABEL[grade]} 버리기`}
    >
      <BbangFish className="rack__fish" fill={gradeColor(grade)} />
      <span className="rack__label">
        <Icon name={FILLING_ICON[item.filling]} /> {GRADE_LABEL[grade]}
      </span>
      <span className="rack__warmth" aria-hidden="true">
        <span className="rack__warmth-fill" style={{ width: `${warmth * 100}%` }} />
      </span>
      <Icon name="trash" className="rack__x" />
    </button>
  );
}
