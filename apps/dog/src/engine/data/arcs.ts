import type { Arc, Tone } from '../types';

type ToneWeights = Record<Tone, number>;

type ArcInfo = {
  /** 결말 카드에서 공개하는 이번 판의 "상영작" 이름. */
  title: string;
  /** 견생 진행률(0~1)에 따른 톤 가중치 지점. 사이 값은 선형으로 잇는다. */
  keyframes: ReadonlyArray<readonly [number, ToneWeights]>;
};

export const ARCS: Record<Arc, ArcInfo> = {
  cheerful: {
    title: '끝까지 웃음 가득',
    keyframes: [
      [0, { cheerful: 0.75, calm: 0.25, touching: 0 }],
      [1, { cheerful: 0.7, calm: 0.25, touching: 0.05 }],
    ],
  },
  laughThenTears: {
    title: '웃다가 찡',
    keyframes: [
      [0, { cheerful: 0.7, calm: 0.3, touching: 0 }],
      [0.5, { cheerful: 0.6, calm: 0.35, touching: 0.05 }],
      [0.8, { cheerful: 0.35, calm: 0.4, touching: 0.25 }],
      [1, { cheerful: 0.15, calm: 0.35, touching: 0.5 }],
    ],
  },
  calmTouching: {
    title: '잔잔하고 뭉클',
    keyframes: [
      [0, { cheerful: 0.2, calm: 0.7, touching: 0.1 }],
      [0.7, { cheerful: 0.2, calm: 0.6, touching: 0.2 }],
      [1, { cheerful: 0.1, calm: 0.4, touching: 0.5 }],
    ],
  },
  tearsThenLaugh: {
    title: '찡하다가 웃음',
    keyframes: [
      [0, { cheerful: 0.1, calm: 0.3, touching: 0.6 }],
      [0.25, { cheerful: 0.55, calm: 0.3, touching: 0.15 }],
      [1, { cheerful: 0.6, calm: 0.3, touching: 0.1 }],
    ],
  },
};

export const ARC_IDS = Object.keys(ARCS) as Arc[];

/** 견생 진행률에 따른 톤 가중치. 합은 언제나 1이다. 2단계 사건 뽑기에서 쓴다. */
export function toneWeights(arc: Arc, progress: number): ToneWeights {
  const frames = ARCS[arc].keyframes;
  const p = Math.min(1, Math.max(0, progress));
  const index = frames.findIndex(([at]) => at >= p);
  if (index <= 0) {
    return normalize(frames[Math.max(0, index)][1]);
  }
  const [fromAt, from] = frames[index - 1];
  const [toAt, to] = frames[index];
  const t = (p - fromAt) / (toAt - fromAt);
  return normalize({
    cheerful: from.cheerful + (to.cheerful - from.cheerful) * t,
    calm: from.calm + (to.calm - from.calm) * t,
    touching: from.touching + (to.touching - from.touching) * t,
  });
}

function normalize(weights: ToneWeights): ToneWeights {
  const total = weights.cheerful + weights.calm + weights.touching;
  return {
    cheerful: weights.cheerful / total,
    calm: weights.calm / total,
    touching: weights.touching / total,
  };
}
