import { FILLINGS } from '../engine';
import { ORDER_PATIENCE_MS, type OpenOrder } from '../game/session';

/**
 * 손님 주문 줄. 소·남은 개수와 인내 막대를 보여 준다. 누를 것은 없다: 틀에서 꺼낸 붕어빵이
 * 그 소를 기다리는 손님에게 저절로 간다.
 */
export function OrderQueue({
  orders,
  elapsedMs,
}: {
  orders: readonly OpenOrder[];
  elapsedMs: number;
}) {
  return (
    <ul className="orders" aria-label="주문 줄">
      {orders.length === 0 && <li className="orders__empty">손님을 기다리는 중…</li>}
      {orders.map((order) => {
        const waited = elapsedMs - order.arrivedAtMs;
        const left = Math.max(0, 1 - waited / ORDER_PATIENCE_MS);
        const label = FILLINGS[order.filling].label;
        return (
          <li
            key={order.id}
            className={`order ${left < 0.25 ? 'order--urgent' : ''}`}
            aria-label={`${label} ${order.remaining}개 주문`}
          >
            <span className="order__filling">{FILLINGS[order.filling].emoji}</span>
            <span className="order__label">{label}</span>
            <span className="order__count">×{order.remaining}</span>
            <span className="order__patience" aria-hidden="true">
              <span className="order__patience-fill" style={{ width: `${left * 100}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
