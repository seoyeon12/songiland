import { useEffect, useState, type RefObject } from 'react';
import type { ShareCard } from './card';
import { createShareImage } from './image';

export type ShareImage = { status: 'making' } | { status: 'ready'; blob: Blob } | { status: 'failed' };

/**
 * 결말 화면이 열리면 공유 카드를 미리 만들어 둔다. 공유 시트는 버튼을 누른 직후에만 열 수 있어서
 * (사파리 등) 누른 뒤에 그리기 시작하면 늦을 수 있다.
 */
export function useShareImage(card: ShareCard, portrait: RefObject<SVGSVGElement | null>): ShareImage {
  const [made, setMade] = useState<{ card: ShareCard; image: ShareImage } | null>(null);

  useEffect(() => {
    let active = true;
    createShareImage(card, portrait.current).then(
      (blob) => {
        if (active) {
          setMade({ card, image: { status: 'ready', blob } });
        }
      },
      () => {
        if (active) {
          setMade({ card, image: { status: 'failed' } });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [card, portrait]);

  return made?.card === card ? made.image : { status: 'making' };
}
