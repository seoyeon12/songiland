import { Sparkles } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { BallMachine } from './BallMachine';
import { CatchBox } from './CatchBox';
import { GradientBackground } from './GradientBackground';
import { RevealBall, type RevealBallMode } from './RevealBall';
import {
  NOZZLE_LENGTH,
  NOZZLE_POS,
  NOZZLE_QUATERNION,
  NOZZLE_RADIUS,
  SLIDE_CURVE,
  SLIDE_END_POS,
} from './exitPath';
import { getRevealCue } from './revealCue';
import { getSceneProfile } from './sceneProfile';
import type { LotterySceneProps } from './sceneTypes';

const MAIN_COUNT = 6;
const BONUS_INDEX = 6;
// Lift the whole stage so the drum sits in the upper area and the slide/tray
// stay clear of the bottom HUD bar.
const STAGE_LIFT: [number, number, number] = [0, 1.2, 0];

export function LotteryScene({
  phase,
  plan,
  revealedCount,
  quality,
  reducedMotion,
  onStageActivate,
  stageProps,
}: LotterySceneProps) {
  const profile = getSceneProfile(quality, reducedMotion);
  const frameCue = getRevealCue(Math.min(revealedCount, MAIN_COUNT), reducedMotion);
  const bonusStage = frameCue.frame === 'gold';

  // Balls keep darting energetically at all times; the shuffle is just livelier.
  const intensity = phase === 'mixing' ? 1.7 : 1.0;

  const revealing = phase === 'revealing';
  const activeIndex = revealing ? revealedCount : revealedCount - 1;
  let revealMode: RevealBallMode = 'hidden';
  if (plan && revealing) {
    revealMode = 'emerging';
  } else if (plan && revealedCount > 0) {
    revealMode = 'resting';
  }
  const revealNumber =
    plan && activeIndex >= 0 && activeIndex < plan.revealOrder.length
      ? plan.revealOrder[activeIndex]
      : 1;
  const revealDurationMs = getRevealCue(revealedCount, reducedMotion).durationMs;

  const accent = bonusStage ? '#fbbf24' : '#f472b6';
  const accentEmissive = bonusStage ? '#f59e0b' : '#db2777';

  return (
    <div
      className="lottery-scene"
      data-testid="lotto-stage"
      role="application"
      aria-label="송이의 행운 로또쇼 무대"
      tabIndex={0}
      {...stageProps}
    >
      <Canvas
        shadows={profile.shadows}
        dpr={profile.dpr}
        camera={{ position: [0, 0.5, 9], fov: 45 }}
        onPointerMissed={onStageActivate}
      >
        <GradientBackground />
        <fog attach="fog" args={['#3a2d6b', 14, 30]} />
        <Sparkles
          count={60}
          scale={[16, 11, 9]}
          position={[0, 1, 0]}
          size={2.4}
          speed={0.3}
          opacity={0.5}
          color="#d8b4fe"
        />
        <ambientLight intensity={1.15} />
        <hemisphereLight args={['#e0e7ff', '#4c3f80', 0.9]} />
        <directionalLight
          position={[4, 6, 5]}
          intensity={1.8}
          castShadow={profile.shadows}
        />
        <pointLight position={[0, 4, 6]} intensity={40} color="#ffffff" />
        <pointLight
          position={[-4, 2, -3]}
          intensity={35}
          color={bonusStage ? '#a78bfa' : '#f9a8d4'}
        />

        <group position={STAGE_LIFT}>
          <BallMachine
            ballCount={profile.backgroundBallCount}
            intensity={intensity}
            reducedMotion={reducedMotion}
            shadows={profile.shadows}
          />

          {/* suction spout: a ball is drawn into it, the slide starts at its mouth */}
          <mesh position={NOZZLE_POS} quaternion={NOZZLE_QUATERNION}>
            <cylinderGeometry
              args={[NOZZLE_RADIUS, NOZZLE_RADIUS, NOZZLE_LENGTH, 24, 1, true]}
            />
            <meshStandardMaterial
              color={accent}
              emissive={accentEmissive}
              emissiveIntensity={0.4}
              roughness={0.5}
              side={2}
            />
          </mesh>

          {/* helical chute hugging the sphere: spout mouth → front → right side */}
          <mesh>
            <tubeGeometry args={[SLIDE_CURVE, 96, 0.16, 14, false]} />
            <meshStandardMaterial
              color="#c7d2fe"
              transparent
              opacity={0.5}
              roughness={0.25}
            />
          </mesh>

          {/* neon-rimmed glass box that catches the ball at the slide end */}
          <group position={SLIDE_END_POS}>
            <CatchBox accent={accent} accentEmissive={accentEmissive} />
          </group>

          <RevealBall
            mode={revealMode}
            number={revealNumber}
            isBonus={activeIndex === BONUS_INDEX}
            reducedMotion={reducedMotion}
            durationMs={revealDurationMs}
          />
        </group>
      </Canvas>
    </div>
  );
}
