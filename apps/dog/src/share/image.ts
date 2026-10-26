import { CARD_HEIGHT, CARD_WIDTH, drawShareCard, type ShareCard } from './card';

const FALLBACK_FONT =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";

/** 화면의 강아지 SVG를 그림으로 불러온다. 실패하면 그림 없이 카드를 만든다. */
async function loadPortrait(svg: SVGSVGElement | null): Promise<{ image: HTMLImageElement; url: string } | null> {
  if (!svg) {
    return null;
  }
  const copy = svg.cloneNode(true) as SVGSVGElement;
  // 크기가 없는 SVG는 브라우저마다 캔버스에 다르게 그려진다.
  copy.setAttribute('width', '600');
  copy.setAttribute('height', '600');
  copy.removeAttribute('class');
  const markup = new XMLSerializer().serializeToString(copy);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { image, url };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** 결말 카드를 PNG로 만든다. 모두 이 브라우저 안에서 그리고 어디로도 보내지 않는다. */
export async function createShareImage(card: ShareCard, portraitSvg: SVGSVGElement | null): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('캔버스를 쓸 수 없는 브라우저입니다.');
  }
  const portrait = await loadPortrait(portraitSvg);
  try {
    const fontFamily = getComputedStyle(document.body).fontFamily || FALLBACK_FONT;
    drawShareCard(ctx, card, portrait?.image ?? null, fontFamily);
  } finally {
    if (portrait) {
      URL.revokeObjectURL(portrait.url);
    }
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했습니다.'))), 'image/png');
  });
}

/** "견생극장-보리.png". 파일 이름에 쓸 수 없는 글자는 뺀다. */
export function imageFileName(name: string): string {
  const safe = name.replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 30);
  return `견생극장-${safe || '견생'}.png`;
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
    return navigator.canShare({ files: [new File([], 'gyeonsaeng.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

/** 공유 시트를 연다. 플레이어가 닫으면 'cancelled'. */
export async function shareImage(blob: Blob, fileName: string, text: string): Promise<'shared' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: '견생극장', text });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    throw error;
  }
}
