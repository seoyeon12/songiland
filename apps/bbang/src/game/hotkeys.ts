import { FILLING_IDS, type FillingId } from '../engine';
import type { Input, SessionState } from './session';

/**
 * 키보드 단축키. 한글 입력 상태에서도 같은 자리 키가 먹도록 KeyboardEvent.code(물리 키)로 본다.
 * 숫자 1·2·3 = 소, Q W E R T Y = 틀, A S D F G H = 손님,
 * Z = 거치대로(첫 칸 고르기·다시 누르면 풀기), ←·→ = 거치대에서 고른 칸 옮기기,
 * Backspace·Delete = 고른 것 버리기.
 */
export const FILLING_KEYS = ['1', '2', '3'] as const;
export const PAN_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y'] as const;
export const ORDER_KEYS = ['A', 'S', 'D', 'F', 'G', 'H'] as const;
export const RACK_KEY = 'Z';

/**
 * 단축키가 하는 일: 판을 바꾸는 입력, 또는 거치대 붕어빵 고르기(itemId, null = 풀기).
 * 고르기는 화면 상태라 입력 로그에 남기지 않는다.
 */
export type HotkeyAction = { type: 'input'; input: Input } | { type: 'select'; itemId: number | null };

/** KeyboardEvent.code → 화면에 보이는 키 이름('KeyQ' → 'Q', 'Digit1'/'Numpad1' → '1'). */
function keyName(code: string): string | null {
  const match = /^(?:Key|Digit|Numpad)([A-Z0-9])$/.exec(code);
  return match ? match[1] : null;
}

const input = (value: Input): HotkeyAction => ({ type: 'input', input: value });

/** 눌린 키가 하는 일. selected = 거치대에서 고른 붕어빵 id(없으면 null). 해당 칸이 없으면 null. */
export function actionForKey(
  code: string,
  state: SessionState,
  selected: number | null,
): HotkeyAction | null {
  if (code === 'Backspace' || code === 'Delete') {
    return selected === null ? null : input({ type: 'discard', itemId: selected });
  }
  if (code === 'ArrowLeft' || code === 'ArrowRight') {
    const count = state.rack.length;
    if (count === 0) {
      return null;
    }
    const step = code === 'ArrowRight' ? 1 : -1;
    const at = state.rack.findIndex((item) => item.id === selected);
    // 아무것도 안 골랐으면 → 첫 칸, ← 끝 칸. 끝에서는 반대쪽으로 돈다.
    const next = at === -1 ? (step === 1 ? 0 : count - 1) : (at + step + count) % count;
    return { type: 'select', itemId: state.rack[next].id };
  }
  const key = keyName(code);
  if (!key) {
    return null;
  }
  const fillingIndex = (FILLING_KEYS as readonly string[]).indexOf(key);
  if (fillingIndex >= 0) {
    const filling: FillingId | undefined = FILLING_IDS[fillingIndex];
    return filling ? input({ type: 'select', filling }) : null;
  }
  const panIndex = (PAN_KEYS as readonly string[]).indexOf(key);
  if (panIndex >= 0) {
    const pan = state.pans[panIndex];
    if (!pan) {
      return null;
    }
    return input(pan.status === 'empty' ? { type: 'pour', panIndex } : { type: 'take-out', panIndex });
  }
  const orderIndex = (ORDER_KEYS as readonly string[]).indexOf(key);
  if (orderIndex >= 0) {
    const order = state.orders[orderIndex];
    if (!order) {
      return null;
    }
    return input(
      selected === null
        ? { type: 'serve', orderId: order.id }
        : { type: 'give', itemId: selected, orderId: order.id },
    );
  }
  if (key === RACK_KEY) {
    if (selected !== null) {
      return { type: 'select', itemId: null };
    }
    const first = state.rack[0];
    return first ? { type: 'select', itemId: first.id } : null;
  }
  return null;
}
