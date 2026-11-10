import { FILLINGS, type FillingId } from '../engine';
import { ORDER_PATIENCE_MS, type OpenOrder } from '../game/session';

/**
 * 손님 주문 줄. 소·남은 개수와 인내 막대를 보여 주고, 누르면 고른 붕어빵을 그 손님에게 낸다.
 * 고른 붕어빵과 소가 같은 주문은 강조한다.
 */
export function OrderQueue({
  orders,
  elapsedMs,
  pickedFilling,
  disabled,
  onServe,
}: {
  orders: readonly OpenOrder[];
  elapsedMs: number;
  /** 거치대에서 고른 붕어빵의 소(없으면 null). */
  pickedFilling: FillingId | null;
  disabled: boolean;
  onServe: (orderId: number) => void;
}) {
  return (
    <ul className="orders" aria-label="주문 줄">
      {orders.length === 0 && <li className="orders__empty">손님을 기다리는 중…</li>}
      {orders.map((order) => {
        const waited = elapsedMs - order.arrivedAtMs;
        const left = Math.max(0, 1 - waited / ORDER_PATIENCE_MS);
        const classes = [
          'order',
          left < 0.25 ? 'order--urgent' : '',
          pickedFilling === order.filling ? 'order--match' : '',
        ].join(' ');
        return (
          <li key={order.id}>
            <button
              type="button"
              className={classes}
              disabled={disabled}
              onClick={() => onServe(order.id)}
              aria-label={`${FILLINGS[order.filling].label} ${order.remaining}개 주문에 내기`}
            >
              <span className="order__filling">{FILLINGS[order.filling].emoji}</span>
              <span className="order__label">{FILLINGS[order.filling].label}</span>
              <span className="order__count">×{order.remaining}</span>
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
