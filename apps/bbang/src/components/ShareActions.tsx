import { useState } from 'react';
import type { ShareCard } from '../share/card';
import { canShareImages, saveImage, shareImage } from '../share/image';
import { useShareImage } from '../share/useShareImage';

/** 결과 카드를 PNG로 저장하거나, 지원하는 기기에서는 공유 시트로 보낸다. */
export function ShareActions({ card, fileName }: { card: ShareCard; fileName: string }) {
  const image = useShareImage(card);
  const [canShare] = useState(canShareImages);
  const [notice, setNotice] = useState<string | null>(null);

  async function share(blob: Blob) {
    try {
      await shareImage(blob, fileName, `${card.kicker} · ${card.score}`);
      setNotice(null);
    } catch {
      setNotice('공유하지 못했어요. 이미지로 저장해 주세요.');
    }
  }

  return (
    <div className="share">
      <div className="share__buttons">
        <button
          type="button"
          className="btn"
          disabled={image.status !== 'ready'}
          onClick={() => {
            if (image.status === 'ready') {
              saveImage(image.blob, fileName);
              setNotice('이미지를 저장했어요.');
            }
          }}
        >
          이미지로 저장
        </button>
        {canShare && (
          <button
            type="button"
            className="btn"
            disabled={image.status !== 'ready'}
            onClick={() => {
              if (image.status === 'ready') {
                void share(image.blob);
              }
            }}
          >
            공유
          </button>
        )}
      </div>
      <p className="share__note" role="status">
        {image.status === 'failed' ? '이 브라우저에서는 공유 이미지를 만들 수 없어요.' : notice}
      </p>
    </div>
  );
}
