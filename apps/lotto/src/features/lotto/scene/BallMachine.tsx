import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ballColor } from './ballTexture';

const CHAMBER_RADIUS = 2.4;
const BALL_RADIUS = 0.32;
const INNER_RADIUS = CHAMBER_RADIUS - BALL_RADIUS;
const MAX_SPEED = 5.5;
const RESTITUTION = 0.92;

// Reused each frame to avoid per-ball allocations.
const dir = new THREE.Vector3();

function randomDir(target: THREE.Vector3): THREE.Vector3 {
  target.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  if (target.lengthSq() < 1e-6) {
    target.set(0, 1, 0);
  }
  return target.normalize();
}

type Sim = {
  pos: THREE.Vector3[];
  vel: THREE.Vector3[];
  spin: number[];
};

function createSim(count: number): Sim {
  const pos: THREE.Vector3[] = [];
  const vel: THREE.Vector3[] = [];
  const spin: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const r = INNER_RADIUS * Math.cbrt(Math.random());
    pos.push(randomDir(new THREE.Vector3()).multiplyScalar(r));
    vel.push(randomDir(new THREE.Vector3()).multiplyScalar(1 + Math.random()));
    spin.push(0.5 + Math.random() * 2);
  }
  return { pos, vel, spin };
}

export type BallMachineProps = {
  ballCount: number;
  /** Agitation level: higher during the mixing shuffle, calmer otherwise. */
  intensity: number;
  reducedMotion: boolean;
  shadows: boolean;
};

/**
 * Air-blower lottery drum. A central updraft lifts the balls, they spill outward
 * at the top and fall along the walls — a continuous circulation so they keep
 * tumbling instead of piling at the bottom or spinning as one rigid clump.
 */
export function BallMachine({
  ballCount,
  intensity,
  reducedMotion,
  shadows,
}: BallMachineProps) {
  const colors = useMemo(
    () => Array.from({ length: ballCount }, (_, i) => ballColor((i % 45) + 1)),
    [ballCount],
  );

  const groups = useRef<(THREE.Group | null)[]>([]);
  // Mutable physics state lives in a ref (mutated in place across frames) and is
  // (re)built in an effect, never during render, when the ball count changes.
  const simRef = useRef<Sim | null>(null);
  useEffect(() => {
    simRef.current = createSim(ballCount);
  }, [ballCount]);

  useFrame((_, delta) => {
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const dt = Math.min(delta, 0.05);
    const agitation = reducedMotion ? 0.35 : intensity;
    // Balls behave like agitated gas: they keep darting all over the sphere at a
    // roughly constant speed rather than swirling and settling at the bottom.
    const targetSpeed = 2.6 * agitation;
    const turbAccel = 7 * agitation;

    for (let i = 0; i < sim.pos.length; i += 1) {
      const p = sim.pos[i];
      const v = sim.vel[i];

      // random turbulence keeps each ball changing direction (darting)
      v.addScaledVector(randomDir(dir), turbAccel * dt);
      // only a faint downward bias so motion fills the whole volume
      v.y += -0.25 * dt;

      // steer speed toward the target so balls never stall or run away
      const speed = v.length();
      if (speed > 1e-4) {
        const factor = 1 + (targetSpeed / speed - 1) * 0.08;
        v.multiplyScalar(factor);
      }
      if (v.length() > MAX_SPEED) {
        v.multiplyScalar(MAX_SPEED / v.length());
      }
      p.addScaledVector(v, dt);

      // bounce off the inner sphere wall (nearly elastic)
      const dist = p.length();
      if (dist > INNER_RADIUS) {
        dir.copy(p).multiplyScalar(1 / dist); // surface normal
        p.copy(dir).multiplyScalar(INNER_RADIUS);
        v.reflect(dir).multiplyScalar(RESTITUTION);
      }

      const group = groups.current[i];
      if (group) {
        group.position.copy(p);
        group.rotation.x += sim.spin[i] * dt;
        group.rotation.y += sim.spin[i] * 0.7 * dt;
      }
    }
  });

  return (
    <group>
      {/* plush circular base */}
      <mesh position={[0, -3, 0]} receiveShadow={shadows}>
        <cylinderGeometry args={[3.4, 3.6, 0.6, 48]} />
        <meshStandardMaterial color="#3b2f66" roughness={0.85} />
      </mesh>

      {/* transparent spherical chamber */}
      <mesh castShadow={shadows}>
        <sphereGeometry args={[CHAMBER_RADIUS + 0.15, 48, 48]} />
        <meshPhysicalMaterial
          color="#f0f5ff"
          transparent
          opacity={0.12}
          roughness={0.02}
          transmission={0.9}
          thickness={0.4}
        />
      </mesh>

      {/* the tumbling balls (solid colour — no stretched face texture) */}
      {colors.map((color, index) => (
        <group
          key={index}
          ref={(el) => {
            groups.current[index] = el;
          }}
        >
          <mesh castShadow={shadows}>
            <sphereGeometry args={[BALL_RADIUS, 20, 20]} />
            <meshStandardMaterial
              color={color}
              roughness={0.35}
              metalness={0.05}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
