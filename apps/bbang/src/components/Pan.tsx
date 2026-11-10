import { FILLINGS, judge, type ShopConfig } from '../engine';
import { panWindow, type Pan as PanState } from '../game/session';
import { BbangFish } from './BbangFish';
import { gradeColor } from './gradeColor';

/** 틀 한 칸. 비어 있으면 반죽을 붓고, 익었으면 꺼내 거치대에 올린다(덜 익으면 못 꺼낸다). */
export function Pan({
  pan,
  shop,
  elapsedMs,
  onClick,
  disabled,
}: {
  pan: PanState;
  shop: ShopConfig;
  elapsedMs: number;
  onClick: () => void;
  disabled: boolean;
}) {
  if (pan.status === 'empty') {
    return (
      <button type="button" className="pan pan--empty" onClick={onClick} disabled={disabled}>
        <span className="pan__hint">반죽 붓기</span>
      </button>
    );
  }

  const window = panWindow(pan, shop);
  const onPan = elapsedMs - pan.pouredAtMs;
  const doneness = judge(window, onPan);
  const max = window.greenEndMs * 1.25;
  const pct = (ms: number) => `${Math.min(100, Math.max(0, (ms / max) * 100))}%`;
  const label = FILLINGS[pan.filling].label;

  return (
    <button
      type="button"
      className={`pan pan--cooking pan--${doneness}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={doneness === 'raw' ? `${label} 붕어빵 굽는 중` : `${label} 붕어빵 꺼내기`}
    >
      <BbangFish className="pan__fish" fill={gradeColor(doneness)} />
      <span className="pan__filling">
        {FILLINGS[pan.filling].emoji} {label}
        {doneness === 'burnt' && ' · 탔어요!'}
      </span>
      <span className="pan__gauge" aria-hidden="true">
        <span
          className="pan__green"
          style={{ left: pct(window.greenStartMs), right: `calc(100% - ${pct(window.greenEndMs)})` }}
        />
        <span className="pan__marker" style={{ left: pct(onPan) }} />
      </span>
    </button>
  );
}
