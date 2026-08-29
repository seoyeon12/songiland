import * as THREE from 'three';

// Songiland's own soft-neon palette — deliberately not the official lottery ball
// colour system.
export const BALL_PALETTE = [
  '#f472b6',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#38bdf8',
  '#c084fc',
];

export const BONUS_COLOR = '#8b5cf6';

export function ballColor(n: number): string {
  return BALL_PALETTE[n % BALL_PALETTE.length];
}

/**
 * A billboard "face" for a ball: a white disc with the number, transparent
 * elsewhere, drawn on a local canvas (no external font is fetched). Used as a
 * Sprite so the number always faces the camera and never stretches over the
 * sphere.
 */
export function createFaceTexture(number: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#14102a';
    ctx.font = 'bold 68px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(number), size / 2, size / 2 + 4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
