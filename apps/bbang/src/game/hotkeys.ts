import { FILLING_IDS, type FillingId } from '../engine';
import type { Input, SessionState } from './session';

/**
 * 키보드 단축키. 한글 입력 상태에서도 같은 자리 키가 먹도록 KeyboardEvent.code(물리 키)로 본다.
 * 숫자 1·2·3 = 소, Q W E R T Y = 틀(붓기·꺼내기), Z = 거치대 맨 앞(가장 오래된) 붕어빵 버리기.
 * 꺼낸 붕어빵은 손님에게 저절로 가므로 손님 키는 없다.
 */
export const FILLING_KEYS = ['1', '2', '3'] as const;
export const PAN_KEYS = ['Q', 'W', 'E', 'R', 'T', 'Y'] as const;
export const DISCARD_KEY = 'Z';

/** KeyboardEvent.code → 화면에 보이는 키 이름('KeyQ' → 'Q', 'Digit1'/'Numpad1' → '1'). */
function keyName(code: string): string | null {
  const match = /^(?:Key|Digit|Numpad)([A-Z0-9])$/.exec(code);
  return match ? match[1] : null;
}

/** 눌린 키가 하는 입력. 해당 칸이 없거나 관계없는 키면 null. */
export function actionForKey(code: string, state: SessionState): Input | null {
  const key = keyName(code);
  if (!key) {
    return null;
  }
  const fillingIndex = (FILLING_KEYS as readonly string[]).indexOf(key);
  if (fillingIndex >= 0) {
    const filling: FillingId | undefined = FILLING_IDS[fillingIndex];
    return filling ? { type: 'select', filling } : null;
  }
  const panIndex = (PAN_KEYS as readonly string[]).indexOf(key);
  if (panIndex >= 0) {
    const pan = state.pans[panIndex];
    if (!pan) {
      return null;
    }
    return pan.status === 'empty' ? { type: 'pour', panIndex } : { type: 'take-out', panIndex };
  }
  if (key === DISCARD_KEY) {
    const oldest = state.rack[0];
    return oldest ? { type: 'discard', itemId: oldest.id } : null;
  }
  return null;
}
