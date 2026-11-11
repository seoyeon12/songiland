import { describe, expect, it } from 'vitest';
import { createShift, emptyTally } from '../engine';
import { createSession, type SessionState } from '../game/session';
import { CARD_HEIGHT, CARD_WIDTH, drawShareCard, memeCopy, shareCardFor, type ShareCard } from './card';
import { imageFileName } from './image';

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

/** 그린 글자를 기록하는 가짜 캔버스. 도형 메서드는 아무것도 하지 않는다. */
function fakeContext() {
  const texts: Drawn[] = [];
  const noop = () => {};
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
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
    fillRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    bezierCurveTo: noop,
    arcTo: noop,
    arc: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

function played(overrides: Partial<SessionState> = {}): SessionState {
  return {
    ...createSession(createShift(1)),
    tally: {
      ...emptyTally(),
      score: 1840,
      bestStreak: 4,
      counts: { perfect: 9, good: 5, cold: 2 },
      served: 16,
    },
    burnt: 1,
    revenue: 19_800,
    missedOrders: 2,
    ...overrides,
  };
}

function expectToFit(card: ShareCard) {
  const { ctx, texts } = fakeContext();
  drawShareCard(ctx, card, 'sans-serif');
  for (const text of texts) {
    const left = text.align === 'center' ? text.x - text.width / 2 : text.x;
    expect(left, text.text).toBeGreaterThanOrEqual(40);
    expect(left + text.width, text.text).toBeLessThanOrEqual(CARD_WIDTH - 40);
    expect(text.y, text.text).toBeGreaterThan(0);
    expect(text.y, text.text).toBeLessThan(CARD_HEIGHT - 40);
  }
  return texts;
}

describe('shareCardFor', () => {
  it('describes a daily run with its date, score, grades and takings', () => {
    const card = shareCardFor(played(), { mode: 'daily', day: '2026-11-10', isNewBest: true });
    expect(card).toMatchObject({
      kicker: '붕어빵 랭킹전 · 오늘의 장사',
      date: '2026-11-10 (UTC) · 전 세계 같은 판',
      score: '1,840점',
      headline: '최고 콤보 4연속 · 오늘 최고 기록!',
    });
    expect(card.grades.map((grade) => grade.value)).toEqual(['9', '5', '2', '1']);
    expect(card.facts).toContainEqual({ label: '매출', value: '19,800원' });
    expect(card.footer).toContain('bbang.arosys.kr');
  });

  it('has no date for 내 가게', () => {
    const card = shareCardFor(played(), { mode: 'own', day: '2026-11-10', isNewBest: false });
    expect(card.date).toBeNull();
    expect(card.kicker).toBe('붕어빵 랭킹전 · 내 가게');
    expect(card.headline).toBe('최고 콤보 4연속');
  });

  it('picks a meme line by score', () => {
    expect(memeCopy(0)).toContain('탄 맛');
    expect(memeCopy(2000)).toContain('1,000원');
    expect(memeCopy(5000)).toContain('가슴속 3천원');
    expect(memeCopy(9000)).toContain('붕세권');
  });
});

describe('drawShareCard', () => {
  it('draws every line inside the card, top to bottom', () => {
    const card = shareCardFor(played(), { mode: 'daily', day: '2026-11-10', isNewBest: true });
    const texts = expectToFit(card);
    const ys = (needle: string) => texts.find((text) => text.text.includes(needle))!.y;
    expect(ys('2026-11-10')).toBeLessThan(ys('1,840점'));
    expect(ys('1,840점')).toBeLessThan(ys('최고 콤보'));
    expect(ys('최고 콤보')).toBeLessThan(ys('완벽'));
    expect(ys('완벽')).toBeLessThan(ys('매출'));
    expect(ys('매출')).toBeLessThan(ys('“'));
    expect(ys('“')).toBeLessThan(ys('bbang.arosys.kr'));
  });

  it('shrinks or trims huge numbers instead of overflowing', () => {
    const card = shareCardFor(
      played({
        tally: { ...emptyTally(), score: 123_456_789, bestStreak: 999 },
        revenue: 9_999_999_999,
      }),
      { mode: 'own', day: '2026-11-10', isNewBest: true },
    );
    expectToFit(card);
  });
});

describe('imageFileName', () => {
  it('names daily cards by date', () => {
    expect(imageFileName('daily', '2026-11-10')).toBe('붕어빵랭킹전-2026-11-10.png');
    expect(imageFileName('own', '2026-11-10')).toBe('붕어빵랭킹전-내가게.png');
  });
});
