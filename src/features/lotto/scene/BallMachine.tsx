import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LottoBall } from './LottoBall';

// Songiland's own soft-neon palette — deliberately not the official lottery
// ball colour system.
const PALETTE = [
  '#f472b6',
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
];

const CHAMBER_RADIUS = 2.4;

/** Deterministic scatter of balls inside the chamber (no randomness needed). */
function ballPositions(count: number): [number, number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: [number, number, number][] = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    const y = 1 - t * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const shell = CHAMBER_RADIUS * (0.35 + 0.6 * ((i % 5) / 5));
    points.push([
      Math.cos(theta) * ring * shell,
      y * shell,
      Math.sin(theta) * ring * shell,
    ]);
  }
  return points;
}

export type BallMachineProps = {
  ballCount: number;
  reducedMotion: boolean;
  shadows: boolean;
};

export function BallMachine({
  ballCount,
  reducedMotion,
  shadows,
}: BallMachineProps) {
  const positions = useMemo(() => ballPositions(ballCount), [ballCount]);
  const numbers = useMemo(
    () => Array.from({ length: ballCount }, (_, i) => (i % 45) + 1),
    [ballCount],
  );
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (reducedMotion || !spinRef.current) {
      return;
    }
    spinRef.current.rotation.y += delta * 0.15;
  });

  return (
    <group>
      {/* plush circular base */}
      <mesh position={[0, -3, 0]} receiveShadow={shadows}>
        <cylinderGeometry args={[3.4, 3.6, 0.6, 48]} />
        <meshStandardMaterial color="#2a2250" roughness={0.9} />
      </mesh>

      {/* lighting arch */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[3.2, 0.12, 16, 64, Math.PI]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#7c3aed"
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* transparent upward tube */}
      <mesh position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 2.4, 24, 1, true]} />
        <meshPhysicalMaterial
          color="#dbeafe"
          transparent
          opacity={0.18}
          roughness={0.05}
          transmission={0.9}
        />
      </mesh>

      {/* transparent spherical chamber */}
      <mesh castShadow={shadows}>
        <sphereGeometry args={[CHAMBER_RADIUS + 0.15, 48, 48]} />
        <meshPhysicalMaterial
          color="#e0f2fe"
          transparent
          opacity={0.12}
          roughness={0.02}
          transmission={0.95}
          thickness={0.4}
        />
      </mesh>

      {/* the tumbling balls */}
      <group ref={spinRef}>
        {positions.map((position, index) => (
          <LottoBall
            key={index}
            number={numbers[index]}
            color={PALETTE[index % PALETTE.length]}
            position={position}
            castShadow={shadows}
          />
        ))}
      </group>
    </group>
  );
}
