import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';

/** 끌어다 놓을 곳: 손님 주문 카드 또는 휴지통. DOM에는 data-drop="order:<id>" / "trash"로 표시한다. */
export type DropTarget = { kind: 'order'; orderId: number } | { kind: 'trash' };

export type RackDrag = { itemId: number; x: number; y: number; over: DropTarget | null };

/** 이만큼(px) 움직이면 탭이 아니라 끌기로 본다. */
const DRAG_THRESHOLD = 8;

export function dropAttr(target: DropTarget): string {
  return target.kind === 'trash' ? 'trash' : `order:${target.orderId}`;
}

function targetAt(x: number, y: number): DropTarget | null {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]');
  const value = element?.dataset.drop;
  if (value === 'trash') {
    return { kind: 'trash' };
  }
  const match = value ? /^order:(\d+)$/.exec(value) : null;
  return match ? { kind: 'order', orderId: Number(match[1]) } : null;
}

/**
 * 거치대 붕어빵 끌어다 놓기(마우스·터치 공통, 포인터 이벤트). 조금 움직이고 떼면 탭(onTap),
 * 끌다가 손님·휴지통 위에서 떼면 onDrop. 키보드(Enter·Space)로 누르면 탭으로 본다.
 */
export function useRackDrag(
  onTap: (itemId: number) => void,
  onDrop: (itemId: number, target: DropTarget) => void,
) {
  const [drag, setDrag] = useState<RackDrag | null>(null);
  const pressRef = useRef<{ itemId: number; x: number; y: number; dragging: boolean } | null>(null);

  const bind = (itemId: number) => ({
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      pressRef.current = { itemId, x: event.clientX, y: event.clientY, dragging: false };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const press = pressRef.current;
      if (!press || press.itemId !== itemId) {
        return;
      }
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (!press.dragging && moved < DRAG_THRESHOLD) {
        return;
      }
      press.dragging = true;
      setDrag({ itemId, x: event.clientX, y: event.clientY, over: targetAt(event.clientX, event.clientY) });
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const press = pressRef.current;
      pressRef.current = null;
      if (!press || press.itemId !== itemId) {
        return;
      }
      setDrag(null);
      if (!press.dragging) {
        onTap(itemId);
        return;
      }
      const target = targetAt(event.clientX, event.clientY);
      if (target) {
        onDrop(itemId, target);
      }
    },
    onPointerCancel() {
      pressRef.current = null;
      setDrag(null);
    },
    onClick(event: MouseEvent<HTMLElement>) {
      // 포인터로 누른 건 onPointerUp에서 처리했다. detail 0 = 키보드로 누른 클릭.
      if (event.detail === 0) {
        onTap(itemId);
      }
    },
  });

  return { drag, bind };
}
