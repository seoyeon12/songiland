import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

function makeGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#140f2e'); // top, deep night
    gradient.addColorStop(0.55, '#3a2d6b'); // mid, violet
    gradient.addColorStop(1, '#7b53a8'); // bottom, warm neon glow
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A soft vertical gradient attached as the scene background. */
export function GradientBackground() {
  const texture = useMemo(() => makeGradientTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <primitive object={texture} attach="background" />;
}
