/** 0~1로 자른다. */
export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** a에서 b로 t(0~1)만큼 간 값. t는 0~1로 잘라 쓴다. */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * clamp01(t);
