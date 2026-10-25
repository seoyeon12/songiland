import { ARC_IDS, toneWeights } from './arcs';

describe('toneWeights', () => {
  it('always sums to one', () => {
    for (const arc of ARC_IDS) {
      for (const progress of [-1, 0, 0.1, 0.3, 0.5, 0.75, 0.9, 1, 2]) {
        const w = toneWeights(arc, progress);
        expect(w.cheerful + w.calm + w.touching).toBeCloseTo(1, 6);
      }
    }
  });

  it('follows each arc shape', () => {
    expect(toneWeights('laughThenTears', 0).cheerful).toBeGreaterThan(
      toneWeights('laughThenTears', 1).cheerful,
    );
    expect(toneWeights('laughThenTears', 1).touching).toBeGreaterThan(0.4);
    expect(toneWeights('tearsThenLaugh', 0).touching).toBeGreaterThan(0.5);
    expect(toneWeights('tearsThenLaugh', 0.6).cheerful).toBeGreaterThan(0.5);
    expect(toneWeights('cheerful', 0.95).touching).toBeLessThan(0.1);
    expect(toneWeights('calmTouching', 0.2).calm).toBeGreaterThan(0.6);
  });
});
