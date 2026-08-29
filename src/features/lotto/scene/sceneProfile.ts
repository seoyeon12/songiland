import type { SceneProfile, SceneQuality } from './sceneTypes';

const HIGH_BALL_COUNT = 45;
const LOW_BALL_COUNT = 18;

/**
 * Chooses the visual budget from the device quality and the reduced-motion
 * preference. Reduced motion always cuts shadows, particles, and camera travel;
 * low quality thins the chamber and drops shadows. Visual-only: it never touches
 * the draw result.
 */
export function getSceneProfile(
  quality: SceneQuality,
  reducedMotion: boolean,
): SceneProfile {
  const high = quality === 'high';
  const fullMotion = high && !reducedMotion;
  return {
    backgroundBallCount: high ? HIGH_BALL_COUNT : LOW_BALL_COUNT,
    shadows: fullMotion,
    particles: fullMotion,
    cameraMotion: reducedMotion ? 'cut' : 'travel',
    dpr: high ? [1, 2] : [1, 1.5],
  };
}
