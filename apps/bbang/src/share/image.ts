import { CARD_HEIGHT, CARD_WIDTH, drawShareCard, type ShareCard } from './card';

const FALLBACK_FONT =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";

/** 결과 카드를 PNG로 만든다. 모두 이 브라우저 안에서 그리고 어디로도 보내지 않는다. */
export async function createShareImage(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('캔버스를 쓸 수 없는 브라우저입니다.');
  }
  const fontFamily = getComputedStyle(document.body).fontFamily || FALLBACK_FONT;
  drawShareCard(ctx, card, fontFamily);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했습니다.'))), 'image/png');
  });
}

/** "붕어빵랭킹전-2026-11-10.png" · 내 가게면 "붕어빵랭킹전-내가게.png". */
export function imageFileName(mode: 'daily' | 'own', day: string): string {
  return mode === 'daily' ? `붕어빵랭킹전-${day}.png` : '붕어빵랭킹전-내가게.png';
}

export function saveImage(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // 내려받기가 시작된 뒤에 풀어 준다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** 이미지 파일을 공유 시트로 보낼 수 있는 기기인지(주로 휴대폰). */
export function canShareImages(): boolean {
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [new File([], 'bbang.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/** 공유 시트를 연다. 플레이어가 닫으면 'cancelled'. */
export async function shareImage(blob: Blob, fileName: string, text: string): Promise<'shared' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: '붕어빵 랭킹전', text });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    throw error;
  }
}
