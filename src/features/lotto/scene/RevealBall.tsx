import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BONUS_COLOR, ballColor, createFaceTexture } from './ballTexture';
import {
  DISPLAY,
  INTERIOR_START,
  SLIDE_END,
  SLIDE_START,
  slideAt,
} from './exitPath';

export type RevealBallMode = 'hidden' | 'emerging' | 'resting';

export type RevealBallProps = {
  mode: RevealBallMode;
  number: number;
  isBonus: boolean;
  reducedMotion: boolean;
  durationMs: number;
};

const BALL_RADIUS = 0.42;
const SUCK_END = 0.15; // interior → sucked into the spout
const SLIDE_END_T = 0.72; // rolls down the chute into the basket by here
const HOLD_END = 0.82; // settles in the basket, then glides to the centre

const REST_QUAT = new THREE.Quaternion(); // identity → decal faces +z (camera)
const prevPos = new THREE.Vector3();
const move = new THREE.Vector3();
const normal = new THREE.Vector3();
const axis = new THREE.Vector3();

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * The single ball being drawn. On each reveal it is sucked out of the left hole,
 * rolls (really rotating, its number decal tumbling) down the chute that hugs
 * the sphere to the right side, then glides to the front centre and settles
 * facing the camera so its number is readable. Purely presentational.
 */
export function RevealBall({
  mode,
  number,
  isBonus,
  reducedMotion,
  durationMs,
}: RevealBallProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const started = useRef(false);

  const color = isBonus ? BONUS_COLOR : ballColor(number);
  const face = useMemo(() => createFaceTexture(number), [number]);
  useEffect(() => () => face.dispose(), [face]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    const ball = ballRef.current;
    if (!group || !ball) {
      return;
    }
    if (mode === 'hidden') {
      group.visible = false;
      elapsed.current = 0;
      started.current = false;
      return;
    }
    group.visible = true;

    if (mode === 'resting') {
      elapsed.current = 0;
      started.current = false;
      group.position.copy(DISPLAY);
      ball.quaternion.slerp(REST_QUAT, Math.min(1, delta * 6));
      return;
    }

    // emerging
    elapsed.current += delta;
    const duration = Math.max(0.001, durationMs / 1000);
    const t = reducedMotion ? 1 : Math.min(1, elapsed.current / duration);

    let rolling = false;
    if (t < SUCK_END) {
      // sucked from the interior out to the hole
      const k = 1 - Math.pow(1 - t / SUCK_END, 3);
      group.position.copy(INTERIOR_START).lerp(SLIDE_START, k);
      rolling = true;
    } else if (t < SLIDE_END_T) {
      // rolling down the chute into the basket (same curve as the tube)
      const k = (t - SUCK_END) / (SLIDE_END_T - SUCK_END);
      slideAt(smoothstep(k), group.position);
      rolling = true;
    } else if (t < HOLD_END) {
      // settles in the basket at the slide end
      group.position.copy(SLIDE_END);
    } else {
      // lifts from the basket and glides to the front centre, facing the camera
      const k = (t - HOLD_END) / (1 - HOLD_END);
      group.position.copy(SLIDE_END).lerp(DISPLAY, smoothstep(k));
      ball.quaternion.slerp(REST_QUAT, Math.min(1, delta * 5));
    }

    if (rolling) {
      if (!started.current) {
        prevPos.copy(group.position);
        started.current = true;
      } else {
        move.copy(group.position).sub(prevPos);
        const dist = move.length();
        if (dist > 1e-5) {
          normal.copy(group.position).normalize(); // outward from sphere centre
          axis.copy(normal).cross(move).normalize();
          ball.rotateOnWorldAxis(axis, dist / BALL_RADIUS);
        }
        prevPos.copy(group.position);
      }
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.05} />
        {/* number printed on the ball surface so the roll is visible */}
        <mesh position={[0, 0, BALL_RADIUS + 0.001]}>
          <circleGeometry args={[BALL_RADIUS * 0.7, 32]} />
          <meshStandardMaterial
            map={face}
            transparent
            roughness={0.4}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
      </mesh>
    </group>
  );
}
