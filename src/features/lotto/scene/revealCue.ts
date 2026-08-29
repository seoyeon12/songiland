export type RevealKind = 'mixing' | 'main' | 'bonus';
export type RevealCamera = 'travel' | 'cut';
export type RevealFrame = 'default' | 'gold';
export type RevealLight = 'default' | 'violet';

export type RevealCue = {
  kind: RevealKind;
  durationMs: number;
  camera: RevealCamera;
  frame: RevealFrame;
  light: RevealLight;
};

export const MIXING_DURATION_MS = 2_400;
export const MAIN_REVEAL_DURATION_MS = 1_200;
export const BONUS_REVEAL_DURATION_MS = 1_500;

const MAIN_COUNT = 6;

function camera(reducedMotion: boolean): RevealCamera {
  return reducedMotion ? 'cut' : 'travel';
}

/**
 * Purely presentational cue for the shuffle before any ball is revealed.
 * It carries only timing/visual hints and never influences which numbers show.
 */
export function getMixingCue(reducedMotion: boolean): RevealCue {
  return {
    kind: 'mixing',
    durationMs: MIXING_DURATION_MS,
    camera: camera(reducedMotion),
    frame: 'default',
    light: 'default',
  };
}

/**
 * Cue for revealing the ball at `revealedCount` (0..6). The seventh ball
 * (revealedCount === 6) uses the gold frame + violet light bonus treatment and
 * a longer duration. Reduced motion swaps camera travel for a cut.
 */
export function getRevealCue(
  revealedCount: number,
  reducedMotion: boolean,
): RevealCue {
  const isBonus = revealedCount >= MAIN_COUNT;
  return {
    kind: isBonus ? 'bonus' : 'main',
    durationMs: isBonus ? BONUS_REVEAL_DURATION_MS : MAIN_REVEAL_DURATION_MS,
    camera: camera(reducedMotion),
    frame: isBonus ? 'gold' : 'default',
    light: isBonus ? 'violet' : 'default',
  };
}
