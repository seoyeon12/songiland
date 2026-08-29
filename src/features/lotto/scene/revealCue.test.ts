import { getMixingCue, getRevealCue } from './revealCue';

it('uses the special bonus cue only for the seventh ball', () => {
  expect(getRevealCue(5, false).kind).toBe('main');
  expect(getRevealCue(6, false)).toMatchObject({
    kind: 'bonus',
    frame: 'gold',
    light: 'violet',
  });
});

it('uses cuts instead of camera travel when motion is reduced', () => {
  expect(getRevealCue(0, true).camera).toBe('cut');
  expect(getRevealCue(0, false).camera).toBe('travel');
});

it('uses the approved durations: 1200ms main, 1500ms bonus, 2400ms mixing', () => {
  expect(getRevealCue(0, false).durationMs).toBe(1200);
  expect(getRevealCue(6, false).durationMs).toBe(1500);
  expect(getMixingCue(false).durationMs).toBe(2400);
});

it('keeps the main cue plain and the mixing cue neutral', () => {
  expect(getRevealCue(2, false)).toMatchObject({ frame: 'default', light: 'default' });
  expect(getMixingCue(false)).toMatchObject({ kind: 'mixing', frame: 'default' });
  expect(getMixingCue(true).camera).toBe('cut');
});
