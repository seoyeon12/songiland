import { Canvas } from '@react-three/fiber';
import { BallMachine } from './BallMachine';
import { getRevealCue } from './revealCue';
import { getSceneProfile } from './sceneProfile';
import type { LotterySceneProps } from './sceneTypes';

const MAIN_COUNT = 6;

/**
 * Visual-only 3D stage. It renders the machine and the already-decided reveal
 * frame colour, but never generates numbers, writes history, or decides state
 * transitions. Reveal animation is layered on in Task 6.
 */
export function LotteryScene({
  revealedCount,
  quality,
  reducedMotion,
  onStageActivate,
  stageProps,
}: LotterySceneProps) {
  const profile = getSceneProfile(quality, reducedMotion);
  // Drive the front frame / key light from the same cue the reveal timeline uses,
  // clamped so the bonus treatment persists through completion (revealedCount 7).
  const cue = getRevealCue(Math.min(revealedCount, MAIN_COUNT), reducedMotion);
  const bonusStage = cue.frame === 'gold';

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
        <color attach="background" args={['#14102a']} />
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[4, 6, 5]}
          intensity={1.1}
          castShadow={profile.shadows}
        />
        <pointLight
          position={[-4, 2, -3]}
          intensity={30}
          color={bonusStage ? '#8b5cf6' : '#f472b6'}
        />

        {/* front reveal frame: turns gold once the six main balls are out */}
        <mesh position={[0, 0, 3.2]}>
          <torusGeometry args={[0.9, 0.06, 16, 48]} />
          <meshStandardMaterial
            color={bonusStage ? '#fbbf24' : '#f472b6'}
            emissive={bonusStage ? '#f59e0b' : '#db2777'}
            emissiveIntensity={0.5}
          />
        </mesh>

        <BallMachine
          ballCount={profile.backgroundBallCount}
          reducedMotion={reducedMotion}
          shadows={profile.shadows}
        />
      </Canvas>
    </div>
  );
}
