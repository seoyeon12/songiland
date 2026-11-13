import type { ShopConfig } from '../engine';
import type { RackItem } from '../game/session';
import { FishItem } from './FishItem';
import type { RackDrag, useRackDrag } from './useRackDrag';

/**
 * 거치대(표준 3칸)와 오른쪽 휴지통. 붕어빵을 끌어 손님 카드에 놓으면 건네고, 휴지통에 놓으면 버린다.
 * 눌러서 고른 뒤 손님·휴지통을 눌러도 된다. 오래 두면 식는다.
 */
export function Rack({
  rack,
  shop,
  elapsedMs,
  disabled,
  selected,
  drag,
  bind,
  onTrash,
}: {
  rack: readonly RackItem[];
  shop: ShopConfig;
  elapsedMs: number;
  disabled: boolean;
  selected: number | null;
  drag: RackDrag | null;
  bind: ReturnType<typeof useRackDrag>['bind'];
  /** 휴지통을 눌렀을 때(고른 붕어빵이 있으면 버린다). */
  onTrash: () => void;
}) {
  const empties = Math.max(0, shop.rackSlots - rack.length);
  const armed = selected !== null || drag !== null;
  const trashOver = drag?.over?.kind === 'trash';
  return (
    <div className="rack">
      <ul
        className="rack__slots"
        aria-label={`거치대 (${rack.length}/${shop.rackSlots})`}
        style={{ gridTemplateColumns: `repeat(${shop.rackSlots}, minmax(0, 1fr))` }}
      >
        {rack.map((item) => (
          <li key={item.id}>
            <FishItem
              item={item}
              shop={shop}
              elapsedMs={elapsedMs}
              disabled={disabled}
              selected={selected === item.id}
              dragging={drag?.itemId === item.id}
              handlers={bind(item.id)}
            />
          </li>
        ))}
        {Array.from({ length: empties }, (_, index) => (
          <li key={`empty-${index}`} className="rack__empty" aria-hidden="true" />
        ))}
      </ul>
      <button
        type="button"
        data-drop="trash"
        className={`rack__trash ${armed ? 'rack__trash--armed' : ''} ${trashOver ? 'rack__trash--over' : ''}`}
        disabled={disabled}
        onClick={onTrash}
        aria-label="고른 붕어빵 버리기"
      >
        <span aria-hidden="true">🗑️</span>
        <span className="rack__trash-label">휴지통</span>
      </button>
    </div>
  );
}
