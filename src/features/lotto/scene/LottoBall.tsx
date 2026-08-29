import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export type LottoBallProps = {
  number: number;
  color: string;
  position: [number, number, number];
  radius?: number;
  castShadow?: boolean;
};

/**
 * Draws the number onto a local canvas texture. No external font is fetched, so
 * the built game makes no network request for the ball faces.
 */
function createNumberTexture(number: number, color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#14102a';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), size / 2, size / 2 + 4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function LottoBall({
  number,
  color,
  position,
  radius = 0.42,
  castShadow = false,
}: LottoBallProps) {
  const texture = useMemo(
    () => createNumberTexture(number, color),
    [number, color],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} castShadow={castShadow}>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial map={texture} roughness={0.4} metalness={0.05} />
    </mesh>
  );
}
