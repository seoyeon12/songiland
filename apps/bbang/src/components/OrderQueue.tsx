import { FILLINGS, type FillingId, type ShopConfig } from '../engine';
import { ORDER_PATIENCE_MS, packFor, type OpenOrder, type RackItem } from '../game/session';

/**
 * 손님 주문 줄. 소·남은 개수와 인내 막대를 보여 주고, 누르면 거치대의 그 소를 봉투에 담아 건넨다.
 * 지금 바로 건넬 수 있는 손님은 반짝이고 '받을 준비' 개수를 보여 준다. 거치대에서 붕어빵을 고르거나
 * 끌고 있으면, 그 소를 주문한 손님만 반짝이고 끌어다 놓을 수 있다(data-drop).
 */
export function OrderQueue({
  orders,
  elapsedMs,
  rack,
  shop,
  disabled,
  hotkeys,
  heldFilling,
  overOrderId,
  onServe,
}: {
  orders: readonly OpenOrder[];
  elapsedMs: number;
  rack: readonly RackItem[];
  shop: ShopConfig;
  disabled: boolean;
  /** 앞에서부터 손님별 단축키 이름. */
  hotkeys: readonly string[];
  /** 고르거나 끌고 있는 붕어빵의 소(없으면 null). */
  heldFilling: FillingId | null;
  /** 끌고 있는 붕어빵이 지금 올라가 있는 손님. */
  overOrderId: number | null;
  onServe: (orderId: number) => void;
}) {
  return (
    <ul className="orders" aria-label="주문 줄">
      {orders.length === 0 && <li className="orders__empty">손님을 기다리는 중…</li>}
      {orders.map((order, index) => {
        const waited = elapsedMs - order.arrivedAtMs;
        const left = Math.max(0, 1 - waited / ORDER_PATIENCE_MS);
        const ready = heldFilling === null ? packFor(order, rack, elapsedMs, shop).length : 0;
        const match = heldFilling === null ? ready > 0 : heldFilling === order.filling;
        const classes = [
          'order',
          left < 0.25 ? 'order--urgent' : '',
          match ? 'order--match' : '',
          overOrderId === order.id ? 'order--over' : '',
        ].join(' ');
        const label = FILLINGS[order.filling].label;
        return (
          <li key={order.id}>
            <button
              type="button"
              data-drop={`order:${order.id}`}
              className={classes}
              disabled={disabled}
              onClick={() => onServe(order.id)}
              aria-label={`${label} ${order.remaining}개 주문${ready > 0 ? ` · ${ready}개 봉투에 담아 건네기` : ''}`}
            >
              {hotkeys[index] && (
                <kbd className="hotkey" aria-hidden="true">
                  {hotkeys[index]}
                </kbd>
              )}
              <span className="order__filling">{FILLINGS[order.filling].emoji}</span>
              <span className="order__label">{label}</span>
              <span className="order__count">×{order.remaining}</span>
              {ready > 0 && <span className="order__ready">🛍️ {ready}개 주기</span>}
              <span className="order__patience" aria-hidden="true">
                <span className="order__patience-fill" style={{ width: `${left * 100}%` }} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
