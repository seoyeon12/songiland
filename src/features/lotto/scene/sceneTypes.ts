import type { DrawPhase, DrawPlan } from '../domain/types';

export type SceneQuality = 'high' | 'low';
export type CameraMotion = 'travel' | 'cut';

export type SceneProfile = {
  /** Number of balls rendered inside the chamber (45 high, 18 low). */
  backgroundBallCount: number;
  shadows: boolean;
  particles: boolean;
  cameraMotion: CameraMotion;
  /** Device-pixel-ratio clamp for the Canvas. */
  dpr: [number, number];
};

export type LotterySceneProps = {
  phase: DrawPhase;
  plan: DrawPlan | null;
  revealedCount: number;
  quality: SceneQuality;
  reducedMotion: boolean;
  onStageActivate: () => void;
};
