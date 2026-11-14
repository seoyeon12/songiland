import type { SessionState } from '../game/session';

/** 공유 카드 크기. 인스타그램 피드 세로(4:5)에 맞춘다. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/** 카드에 쓰는 글. 점수·판정·날짜만 담고 개인 정보는 없다. */
export type ShareCard = {
  /** "붕어빵 랭킹전 · 오늘의 장사" */
  kicker: string;
  /** "2026-11-10 (UTC) · 전 세계 같은 판" — 내 가게 모드면 null */
  date: string | null;
  score: string;
  /** "최고 콤보 4연속 · 오늘 최고 기록!" */
  headline: string;
  grades: readonly { label: string; value: string }[];
  facts: readonly { label: string; value: string }[];
  /** 겨울 길거리 밈 한 줄(12장). */
  copy: string;
  /** 같은 판 도전 권유 + 주소 */
  footer: string;
};

export type ShareMode = 'daily' | 'own';

/**
 * 점수대별 밈 한 줄. 붕세권·가슴속 3천원·1,000원 한 마리(12장 소재).
 * 기준은 5단계 봇 측정(초보 약 2,300 · 보통 약 5,600 · 고수 약 11,700점)으로 나눴다.
 */
export function memeCopy(score: number): string {
  if (score >= 8000) {
    return '붕세권의 전설 — 이 동네 붕어빵은 내가 지킨다';
  }
  if (score >= 4000) {
    return '줄 서서 먹는 집. 가슴속 3천원 지도에 올라갈 각';
  }
  if (score >= 1500) {
    return '오늘도 따끈하게, 1,000원에 한 마리';
  }
  return '붕어빵은 원래 살짝 탄 맛이지… (아님)';
}

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`;

export function shareCardFor(
  state: SessionState,
  { mode, day, isNewBest }: { mode: ShareMode; day: string; isNewBest: boolean },
): ShareCard {
  const { tally } = state;
  const best = isNewBest ? (mode === 'daily' ? ' · 오늘 최고 기록!' : ' · 내 가게 최고 기록!') : '';
  return {
    kicker: `붕어빵 랭킹전 · ${mode === 'daily' ? '오늘의 장사' : '내 가게'}`,
    date: mode === 'daily' ? `${day} (UTC) · 전 세계 같은 판` : null,
    score: `${tally.score.toLocaleString('ko-KR')}점`,
    headline: `최고 콤보 ${tally.bestStreak}연속${best}`,
    grades: [
      { label: '완벽', value: String(tally.counts.perfect) },
      { label: '좋음', value: String(tally.counts.good) },
      { label: '식음', value: String(tally.counts.cold) },
      { label: '탐', value: String(state.burnt) },
    ],
    facts: [
      { label: '판 붕어빵', value: `${tally.served}개` },
      { label: '매출', value: won(state.revenue) },
      { label: '놓친 손님', value: `${state.missedOrders}팀` },
    ],
    copy: memeCopy(tally.score),
    footer:
      mode === 'daily' ? '오늘 같은 판으로 겨뤄 보세요 · bunguppang.arosys.kr' : 'bunguppang.arosys.kr',
  };
}

/** 공통 디자인 시스템(base.css)의 색. 캔버스는 CSS 변수를 읽지 못해 값을 그대로 둔다. */
const COLORS = {
  bg: '#f7f6f3',
  surface: '#ffffff',
  surfaceMuted: '#f1efeb',
  border: '#e6e3de',
  text: '#1c1b19',
  muted: '#6d6a64',
  accentSoft: '#fff0eb',
  accentText: '#c2410c',
  golden: '#d9a24f',
  line: 'rgba(0,0,0,0.14)',
};

const INSET = 40;
const LEFT = 108;
const CONTENT = CARD_WIDTH - LEFT * 2;
const CENTER = CARD_WIDTH / 2;
const FOOTER_Y = CARD_HEIGHT - INSET - 40;

type Measure = (text: string) => number;

function ellipsize(measure: Measure, text: string, maxWidth: number): string {
  let chars = [...text];
  while (chars.length > 0 && measure(`${chars.join('').trimEnd()}…`) > maxWidth) {
    chars = chars.slice(0, -1);
  }
  return `${chars.join('').trimEnd()}…`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 한 줄 글. 너무 길면 글자 크기를 줄이고, 그래도 길면 말줄임표로 줄인다. */
function line(
  ctx: CanvasRenderingContext2D,
  font: (size: number) => string,
  text: string,
  x: number,
  y: number,
  { size, maxWidth, min = size * 0.75 }: { size: number; maxWidth: number; min?: number },
) {
  let current = size;
  ctx.font = font(current);
  while (current > min && ctx.measureText(text).width > maxWidth) {
    current -= 2;
    ctx.font = font(current);
  }
  const measure = (value: string) => ctx.measureText(value).width;
  ctx.fillText(measure(text) > maxWidth ? ellipsize(measure, text, maxWidth) : text, x, y);
}

/** components/BbangFish.tsx와 같은 붕어빵(120×80 좌표)을 캔버스에 그린다. */
function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.fillStyle = COLORS.golden;
  // 몸통
  ctx.beginPath();
  ctx.moveTo(70, 12);
  ctx.bezierCurveTo(40, 12, 18, 28, 18, 40);
  ctx.bezierCurveTo(18, 52, 40, 68, 70, 68);
  ctx.bezierCurveTo(92, 68, 104, 58, 110, 40);
  ctx.bezierCurveTo(104, 22, 92, 12, 70, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 꼬리
  ctx.beginPath();
  ctx.moveTo(110, 40);
  ctx.lineTo(120, 26);
  ctx.lineTo(116, 40);
  ctx.lineTo(120, 54);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 무늬
  ctx.strokeStyle = COLORS.line;
  ctx.lineCap = 'round';
  for (const [x1, x2] of [
    [44, 52],
    [60, 68],
    [76, 84],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, 24);
    ctx.lineTo(x2, 40);
    ctx.lineTo(x1, 56);
    ctx.stroke();
  }
  // 눈
  ctx.beginPath();
  ctx.arc(34, 34, 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fill();
  ctx.restore();
}

/** 숫자 칸 줄(판정 집계·영업 기록). 회색 상자 안에 라벨과 값을 나란히 둔다. */
function statRow(
  ctx: CanvasRenderingContext2D,
  font: (weight: number) => (size: number) => string,
  items: readonly { label: string; value: string }[],
  y: number,
  valueSize: number,
) {
  roundedRect(ctx, LEFT, y, CONTENT, 128, 28);
  ctx.fillStyle = COLORS.surfaceMuted;
  ctx.fill();
  const column = CONTENT / items.length;
  items.forEach((item, index) => {
    const x = LEFT + column * (index + 0.5);
    ctx.fillStyle = COLORS.muted;
    line(ctx, font(700), item.label, x, y + 48, { size: 26, maxWidth: column - 24 });
    ctx.fillStyle = COLORS.text;
    line(ctx, font(800), item.value, x, y + 100, { size: valueSize, maxWidth: column - 24 });
  });
}

/** 공유 카드를 그린다. */
export function drawShareCard(ctx: CanvasRenderingContext2D, card: ShareCard, fontFamily: string): void {
  const font = (weight: number) => (size: number) => `${weight} ${size}px ${fontFamily}`;
  const measure = (text: string) => ctx.measureText(text).width;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  roundedRect(ctx, INSET, INSET, CARD_WIDTH - INSET * 2, CARD_HEIGHT - INSET * 2, 56);
  ctx.fillStyle = COLORS.surface;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 머리띠
  ctx.textAlign = 'center';
  ctx.font = font(700)(30);
  const pill = Math.min(CONTENT, measure(card.kicker) + 64);
  roundedRect(ctx, CENTER - pill / 2, 96, pill, 56, 28);
  ctx.fillStyle = COLORS.accentSoft;
  ctx.fill();
  ctx.fillStyle = COLORS.accentText;
  line(ctx, font(700), card.kicker, CENTER, 135, { size: 30, maxWidth: pill - 48 });

  let y = 135;
  if (card.date) {
    y += 52;
    ctx.fillStyle = COLORS.muted;
    line(ctx, font(600), card.date, CENTER, y, { size: 26, maxWidth: CONTENT });
  }

  // 붕어빵과 둥근 조명
  const fishTop = y + 60;
  const fishScale = 2.6; // 120×80 → 312×208
  ctx.beginPath();
  ctx.arc(CENTER, fishTop + 104, 128, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.accentSoft;
  ctx.fill();
  drawFish(ctx, CENTER - 60 * fishScale, fishTop, fishScale);

  // 점수
  y = fishTop + 208 + 150;
  ctx.fillStyle = COLORS.text;
  line(ctx, font(800), card.score, CENTER, y, { size: 132, maxWidth: CONTENT });
  y += 64;
  ctx.fillStyle = COLORS.accentText;
  line(ctx, font(700), card.headline, CENTER, y, { size: 32, maxWidth: CONTENT });

  // 판정 집계·영업 기록
  y += 44;
  statRow(ctx, font, card.grades, y, 44);
  y += 128 + 24;
  statRow(ctx, font, card.facts, y, 36);
  y += 128;

  // 밈 한 줄
  y += 76;
  ctx.fillStyle = COLORS.text;
  line(ctx, font(600), `“${card.copy}”`, CENTER, y, { size: 32, maxWidth: CONTENT });

  ctx.fillStyle = COLORS.muted;
  line(ctx, font(600), card.footer, CENTER, FOOTER_Y, { size: 26, maxWidth: CONTENT });
}
