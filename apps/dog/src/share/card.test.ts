import { simulateToEnd, startRun } from '../engine';
import {
  CARD_WIDTH,
  drawShareCard,
  mapLayout,
  MOOD_COLORS,
  shareCardFor,
  wrapText,
  type ShareCard,
} from './card';

/** 한글은 1em에 가깝고 나머지는 좁게 잡는 대략적인 글자 폭. */
function width(text: string, size: number): number {
  return [...text].reduce((sum, char) => {
    if (/[가-힣]/.test(char)) {
      return sum + size * 0.92;
    }
    if (char === ' ') {
      return sum + size * 0.28;
    }
    return sum + size * 0.58;
  }, 0);
}

type Drawn = { text: string; x: number; y: number; align: CanvasTextAlign; width: number };
type Cell = { top: number; bottom: number; left: number; right: number };

/** 그린 글자와 견생 지도 칸을 기록하는 가짜 캔버스. */
function fakeContext() {
  const texts: Drawn[] = [];
  const cells: Cell[] = [];
  let points: [number, number][] = [];
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    size() {
      return Number(/(\d+)px/.exec(ctx.font)?.[1] ?? 10);
    },
    measureText(text: string) {
      return { width: width(text, ctx.size()) };
    },
    fillText(text: string, x: number, y: number) {
      texts.push({ text, x, y, align: ctx.textAlign, width: width(text, ctx.size()) });
    },
    fillRect() {},
    beginPath() {
      points = [];
    },
    moveTo(x: number, y: number) {
      points.push([x, y]);
    },
    arcTo(x1: number, y1: number, x2: number, y2: number) {
      points.push([x1, y1], [x2, y2]);
    },
    arc() {},
    closePath() {},
    fill() {
      if ((Object.values(MOOD_COLORS) as string[]).includes(ctx.fillStyle)) {
        const xs = points.map(([x]) => x);
        const ys = points.map(([, y]) => y);
        cells.push({
          left: Math.min(...xs),
          right: Math.max(...xs),
          top: Math.min(...ys),
          bottom: Math.max(...ys),
        });
      }
    },
    stroke() {},
    drawImage() {},
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, cells };
}

function expectToFit(card: ShareCard) {
  const { ctx, texts, cells } = fakeContext();
  drawShareCard(ctx, card, null, 'sans-serif');
  const footer = texts.find((text) => text.text === 'dog.arosys.kr');
  expect(footer).toBeDefined();
  for (const text of texts) {
    const left = text.align === 'center' ? text.x - text.width / 2 : text.x;
    expect(left, text.text).toBeGreaterThanOrEqual(100);
    expect(left + text.width, text.text).toBeLessThanOrEqual(CARD_WIDTH - 100);
  }
  expect(cells).toHaveLength(card.moods.length);
  const mapTop = Math.min(...cells.map((cell) => cell.top));
  const mapBottom = Math.max(...cells.map((cell) => cell.bottom));
  // 글은 모두 지도 위에, 지도는 바닥글 위에 있다.
  for (const text of texts.filter((entry) => entry !== footer)) {
    expect(text.y, text.text).toBeLessThan(mapTop);
  }
  expect(mapBottom).toBeLessThan(footer!.y - 30);
  expect(Math.max(...cells.map((cell) => cell.right))).toBeLessThanOrEqual(CARD_WIDTH - 100);
  return texts.map((text) => text.text);
}

describe('share card', () => {
  it('shows only the dog, its breed and the story', () => {
    const run = simulateToEnd(startRun({ seed: 2024, name: '두부' }));
    const card = shareCardFor(run);
    expect(card.title).toBe('두부의 견생');
    expect(card.facts.map((fact) => fact.label)).toEqual(['함께한 시간', '만난 곳', '나이']);
    expect(card.moods).toHaveLength(run.timeline.length);
    const texts = expectToFit(card);
    expect(texts).toContain('두부의 견생');
    expect(texts).toContain(card.breed);
    expect(texts).toContain(`견생극장 · ${card.arcTitle}`);
  });

  it('fits every real life on the card', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      expectToFit(shareCardFor(simulateToEnd(startRun({ seed, name: '보리' }))));
    }
  });

  it('fits a long name, a big family, long moments and a forty-year map', () => {
    const long = '산책길에서 예전 단짝 친구를 다시 만났어요. 둘 다 주둥이가 하얘졌지만 단번에 서로를 알아봤어요. 정말 오래오래 냄새를 맡았어요.';
    const texts = expectToFit({
      name: '아주아주긴이름의강아지',
      title: '아주아주긴이름의강아지의 견생',
      arcTitle: '웃다가 찡',
      breed: '시고르자브종 (믹스견) · 흰 바탕 검은 점박이',
      family: ['아주아주긴이름의둘째', '아주아주긴이름의셋째'],
      facts: [
        { label: '함께한 시간', value: '19년 11개월' },
        { label: '만난 곳', value: '시골 마당' },
        { label: '나이', value: '11개월 → 20살' },
      ],
      moments: [
        { when: '19년 11개월째', text: long },
        { when: '10년 2개월째', text: long },
        { when: '첫날', text: long },
      ],
      moods: Array.from({ length: 480 }, (_, index) => (index % 3 === 0 ? 'great' : 'good')),
    });
    expect(texts.some((text) => text.endsWith('…'))).toBe(true);
  });
});

describe('wrapText', () => {
  const measure = (text: string) => text.length * 10;

  it('breaks between words and keeps Korean words whole', () => {
    expect(wrapText(measure, '보리가 꽃잎을 잡으려고 뛰었어요', 80, 3)).toEqual([
      '보리가 꽃잎을',
      '잡으려고',
      '뛰었어요',
    ]);
  });

  it('cuts a word that is longer than a line', () => {
    expect(wrapText(measure, 'abcdefghij', 40, 3)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('ends the last line with an ellipsis when it runs out of lines', () => {
    const lines = wrapText(measure, '하나 둘 셋 넷 다섯 여섯 일곱', 50, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith('…')).toBe(true);
    expect(lines.every((line) => measure(line) <= 50)).toBe(true);
  });
});

it('picks the biggest map cells that fit', () => {
  const small = mapLayout(150, 864, 200);
  expect(small.size).toBe(22);
  const big = mapLayout(480, 864, 80);
  expect(big.rows * (big.size + big.gap) - big.gap).toBeLessThanOrEqual(80);
  expect(big.columns * (big.size + big.gap) - big.gap).toBeLessThanOrEqual(864);
  expect(big.size).toBeLessThan(small.size);
});
