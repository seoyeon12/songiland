import { breedLabel, whenLabel } from '../components/labels';
import { formatAge, formatMonths, summarize, type Mood, type RunState } from '../engine';

/** 공유 카드 크기. 인스타그램 피드 세로(4:5)에 맞춘다. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/** 카드에 쓰는 글과 견생 지도. 강아지 이름과 견종 정보만 담고 개인 정보는 없다. */
export type ShareCard = {
  name: string;
  title: string;
  arcTitle: string;
  breed: string;
  /** 함께한 다른 아이들 이름 */
  family: readonly string[];
  facts: readonly { label: string; value: string }[];
  moments: readonly { when: string; text: string }[];
  moods: readonly Mood[];
};

export function shareCardFor(run: RunState): ShareCard {
  const record = summarize(run);
  const { dog } = record;
  return {
    name: dog.name,
    title: `${dog.name}의 견생`,
    arcTitle: record.arcTitle,
    breed: `${breedLabel(run.dogs[0])} · ${dog.coatLabel}`,
    family: record.family.map((member) => member.summary.name),
    facts: [
      { label: '함께한 시간', value: formatMonths(dog.monthsTogether) },
      { label: '만난 곳', value: dog.route },
      { label: '나이', value: `${formatAge(dog.metAgeMonths)} → ${formatAge(dog.ageAtEndMonths)}` },
    ],
    moments: record.highlights.map((moment) => ({ when: whenLabel(moment.month), text: moment.text })),
    moods: record.timeline.map((cell) => cell.mood),
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
};

/** 견생 지도 색. app.css의 .lifemap__cell--* 과 같다. */
export const MOOD_COLORS: Record<Mood, string> = {
  great: '#f0532e',
  good: '#f7b19c',
  okay: '#e6e3de',
  low: '#a8a49d',
};

const INSET = 40;
const LEFT = 108;
const CONTENT = CARD_WIDTH - LEFT * 2;
const CENTER = CARD_WIDTH / 2;
const PORTRAIT = 300;
const FOOTER_Y = CARD_HEIGHT - INSET - 34;
const LINE = 38;
const WHEN_COLUMN = 196;

type Measure = (text: string) => number;

/** 가장 긴 줄이 들어가도록 글자 수를 줄이고 끝에 말줄임표를 단다. */
function ellipsize(measure: Measure, text: string, maxWidth: number): string {
  let chars = [...text];
  while (chars.length > 0 && measure(`${chars.join('').trimEnd()}…`) > maxWidth) {
    chars = chars.slice(0, -1);
  }
  return `${chars.join('').trimEnd()}…`;
}

/**
 * 띄어쓰기 단위로 줄을 나눈다(한국어 keep-all). 한 단어가 한 줄보다 길면 글자 단위로 자르고,
 * maxLines를 넘으면 마지막 줄 끝을 말줄임표로 줄인다.
 */
export function wrapText(measure: Measure, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) {
      lines.push(line);
    }
    let rest = [...word];
    while (measure(rest.join('')) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && measure(rest.slice(0, cut).join('')) > maxWidth) {
        cut -= 1;
      }
      lines.push(rest.slice(0, cut).join(''));
      rest = rest.slice(cut);
    }
    line = rest.join('');
  }
  if (line) {
    lines.push(line);
  }
  if (lines.length <= maxLines) {
    return lines;
  }
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = ellipsize(measure, `${kept[maxLines - 1]} ${lines[maxLines]}`, maxWidth);
  return kept;
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

/** 남은 높이에 견생 지도가 다 들어가는 가장 큰 칸 크기. */
export function mapLayout(cells: number, width: number, height: number) {
  for (let size = 22; size > 4; size -= 1) {
    const gap = Math.max(2, Math.round(size / 5));
    const columns = Math.max(1, Math.floor((width + gap) / (size + gap)));
    const rows = Math.ceil(cells / columns);
    if (rows * (size + gap) - gap <= height) {
      return { size, gap, columns, rows };
    }
  }
  const gap = 1;
  const columns = Math.floor((width + gap) / 5);
  return { size: 4, gap, columns, rows: Math.ceil(cells / columns) };
}

/** 공유 카드를 그린다. portrait는 결말 화면의 강아지 그림(없으면 조명만 그린다). */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  card: ShareCard,
  portrait: CanvasImageSource | null,
  fontFamily: string,
): void {
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

  // 이번 상영작
  ctx.textAlign = 'center';
  ctx.font = font(700)(30);
  const kicker = `견생극장 · ${card.arcTitle}`;
  const pill = Math.min(CONTENT, measure(kicker) + 64);
  roundedRect(ctx, CENTER - pill / 2, 88, pill, 56, 28);
  ctx.fillStyle = COLORS.accentSoft;
  ctx.fill();
  ctx.fillStyle = COLORS.accentText;
  line(ctx, font(700), kicker, CENTER, 127, { size: 30, maxWidth: pill - 48 });

  // 강아지 뒤 둥근 조명(app.css의 radial-gradient와 같은 자리)
  const top = 168;
  ctx.beginPath();
  ctx.arc(CENTER, top + PORTRAIT * 0.58, PORTRAIT * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.accentSoft;
  ctx.fill();
  if (portrait) {
    ctx.drawImage(portrait, CENTER - PORTRAIT / 2, top, PORTRAIT, PORTRAIT);
  }

  let y = top + PORTRAIT + 80;
  ctx.fillStyle = COLORS.text;
  line(ctx, font(800), card.title, CENTER, y, { size: 68, maxWidth: CONTENT });
  y += 48;
  ctx.fillStyle = COLORS.muted;
  line(ctx, font(500), card.breed, CENTER, y, { size: 28, maxWidth: CONTENT });
  if (card.family.length > 0) {
    y += 40;
    line(ctx, font(500), `함께한 가족 · ${card.family.join(', ')}`, CENTER, y, {
      size: 26,
      maxWidth: CONTENT,
    });
  }

  // 함께한 시간 · 만난 곳 · 나이
  y += 28;
  roundedRect(ctx, LEFT, y, CONTENT, 112, 28);
  ctx.fillStyle = COLORS.surfaceMuted;
  ctx.fill();
  const column = CONTENT / card.facts.length;
  card.facts.forEach((fact, index) => {
    const x = LEFT + column * (index + 0.5);
    ctx.fillStyle = COLORS.muted;
    line(ctx, font(700), fact.label, x, y + 44, { size: 24, maxWidth: column - 24 });
    ctx.fillStyle = COLORS.text;
    line(ctx, font(700), fact.value, x, y + 90, { size: 34, maxWidth: column - 24 });
  });
  y += 112;

  // 기억에 남는 순간
  ctx.textAlign = 'left';
  if (card.moments.length > 0) {
    y += 56;
    ctx.fillStyle = COLORS.muted;
    line(ctx, font(700), '기억에 남는 순간', LEFT, y, { size: 24, maxWidth: CONTENT });
    y += 10;
    for (const moment of card.moments) {
      y += LINE + 10;
      ctx.fillStyle = COLORS.accentText;
      line(ctx, font(700), moment.when, LEFT, y, { size: 24, maxWidth: WHEN_COLUMN - 16 });
      ctx.fillStyle = COLORS.text;
      ctx.font = font(500)(28);
      const lines = wrapText(measure, moment.text, CONTENT - WHEN_COLUMN, 2);
      lines.forEach((text, index) => {
        ctx.fillText(text, LEFT + WHEN_COLUMN, y + index * LINE);
      });
      y += (lines.length - 1) * LINE;
    }
  }

  // 견생 지도
  y += 60;
  ctx.fillStyle = COLORS.muted;
  line(ctx, font(700), '견생 지도 · 한 칸이 한 달', LEFT, y, { size: 24, maxWidth: CONTENT });
  y += 22;
  const map = mapLayout(card.moods.length, CONTENT, FOOTER_Y - 52 - y);
  const width = map.columns * (map.size + map.gap) - map.gap;
  const startX = LEFT + (CONTENT - Math.min(width, CONTENT)) / 2;
  card.moods.forEach((mood, index) => {
    ctx.fillStyle = MOOD_COLORS[mood];
    const x = startX + (index % map.columns) * (map.size + map.gap);
    const cellY = y + Math.floor(index / map.columns) * (map.size + map.gap);
    roundedRect(ctx, x, cellY, map.size, map.size, Math.min(4, map.size / 4));
    ctx.fill();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.muted;
  line(ctx, font(600), 'dog.arosys.kr', CENTER, FOOTER_Y, { size: 24, maxWidth: CONTENT });
}
