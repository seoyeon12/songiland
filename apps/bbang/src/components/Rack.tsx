import { FILLINGS, type ShopConfig } from '../engine';
import { rackGrade, type RackItem } from '../game/session';
import { BbangFish } from './BbangFish';
import { GRADE_LABEL, gradeColor } from './gradeColor';

/**
 * 거치대(표준 3칸)와 쓰레기통. 붕어빵을 골라 두고 주문 카드를 누르면 서빙, 쓰레기통을 누르면 버린다.
 * 오래 두면 식어서 등급이 내려간다.
 */
export function Rack({
  rack,
  shop,
  picked,
  elapsedMs,
  disabled,
  onPick,
  onDiscard,
}: {
  rack: readonly RackItem[];
  shop: ShopConfig;
  picked: number | null;
  elapsedMs: number;
  disabled: boolean;
  onPick: (itemId: number) => void;
  onDiscard: () => void;
}) {
  const empties = Math.max(0, shop.rackSlots - rack.length);
  return (
    <div className="rack">
      <ul
        className="rack__slots"
        aria-label={`거치대 (${rack.length}/${shop.rackSlots})`}
        style={{ gridTemplateColumns: `repeat(${shop.rackSlots}, 1fr)` }}
      >
        {rack.map((item) => {
          const grade = rackGrade(item, elapsedMs, shop);
          const held = elapsedMs - item.rackedAtMs;
          const cooling = grade === 'perfect' || grade === 'good';
          const warmth = cooling ? 1 - (held % shop.coolStepMs) / shop.coolStepMs : 0;
          const on = picked === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                className={`rack__item rack__item--${grade} ${on ? 'rack__item--on' : ''}`}
                aria-pressed={on}
                disabled={disabled}
                onClick={() => onPick(item.id)}
              >
                <BbangFish className="rack__fish" fill={gradeColor(grade)} />
                <span className="rack__label">
                  {FILLINGS[item.filling].emoji} {GRADE_LABEL[grade]}
                </span>
                <span className="rack__warmth" aria-hidden="true">
                  <span className="rack__warmth-fill" style={{ width: `${warmth * 100}%` }} />
                </span>
              </button>
            </li>
          );
        })}
        {Array.from({ length: empties }, (_, index) => (
          <li key={`empty-${index}`} className="rack__empty" aria-hidden="true" />
        ))}
      </ul>
      <button
        type="button"
        className={`rack__trash ${picked !== null ? 'rack__trash--armed' : ''}`}
        disabled={disabled}
        onClick={onDiscard}
        aria-label="고른 붕어빵 버리기"
      >
        🗑️
      </button>
    </div>
  );
}
