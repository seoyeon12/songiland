import type { ShopConfig } from '../engine';
import type { RackItem } from '../game/session';
import { FishItem } from './FishItem';

/**
 * 거치대(표준 3칸). 기다리는 손님이 없을 때 꺼낸 붕어빵이 여기서 그 소 손님을 기다리고,
 * 손님이 오면 저절로 건네진다. 오래 두면 식는다. 칸이 모자라면 붕어빵을 눌러 버린다.
 */
export function Rack({
  rack,
  shop,
  elapsedMs,
  disabled,
  onDiscard,
}: {
  rack: readonly RackItem[];
  shop: ShopConfig;
  elapsedMs: number;
  disabled: boolean;
  onDiscard: (itemId: number) => void;
}) {
  const empties = Math.max(0, shop.rackSlots - rack.length);
  return (
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
            onDiscard={() => onDiscard(item.id)}
          />
        </li>
      ))}
      {Array.from({ length: empties }, (_, index) => (
        <li key={`empty-${index}`} className="rack__empty" aria-hidden="true" />
      ))}
    </ul>
  );
}
