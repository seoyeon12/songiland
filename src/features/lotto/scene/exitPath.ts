import * as THREE from 'three';

// Local coordinates inside the (upward-shifted) stage group.
// The drum sphere is centred at the origin with radius 2.4.

/** Where the drawn ball starts being sucked from, inside the drum. */
export const INTERIOR_START = new THREE.Vector3(0, 0.2, 0);

// Helix ON the sphere's surface (ball centre just outside the shell): upper-left,
// across the front, levelling off at the right side (a touch toward the viewer).
const R_PATH = 2.75;
const PHI_END = THREE.MathUtils.degToRad(22);
const A_START = THREE.MathUtils.degToRad(44); // left elevation (upper ~15%)
const A_END = THREE.MathUtils.degToRad(-20); // right elevation (lower ~65%)

function helix(s: number, out: THREE.Vector3): THREE.Vector3 {
  const phi = THREE.MathUtils.lerp(Math.PI, PHI_END, s);
  const alpha = THREE.MathUtils.lerp(A_START, A_END, s * (2 - s));
  const hr = R_PATH * Math.cos(alpha);
  return out.set(hr * Math.cos(phi), R_PATH * Math.sin(alpha), hr * Math.sin(phi));
}

// Suction spout: a short tube sticking out of the shell at the exit, wide enough
// for one ball. The ball is sucked into it and the slide begins at its mouth.
const SHELL = 2.4;
export const NOZZLE_LENGTH = 0.7;
export const NOZZLE_RADIUS = 0.52;
const nozzleDir = helix(0, new THREE.Vector3()).normalize();
const MOUTH = nozzleDir.clone().multiplyScalar(SHELL + NOZZLE_LENGTH);

export const NOZZLE_POS: [number, number, number] = (() => {
  const mid = nozzleDir.clone().multiplyScalar(SHELL + NOZZLE_LENGTH / 2);
  return [mid.x, mid.y, mid.z];
})();
const nozzleQuat = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, 1, 0), // cylinder axis
  nozzleDir,
);
export const NOZZLE_QUATERNION: [number, number, number, number] = [
  nozzleQuat.x,
  nozzleQuat.y,
  nozzleQuat.z,
  nozzleQuat.w,
];

// The slide starts at the spout mouth and flows down into the helix.
const slidePts: THREE.Vector3[] = [MOUTH.clone()];
for (let i = 0; i <= 28; i += 1) {
  slidePts.push(helix(i / 28, new THREE.Vector3()));
}
export const SLIDE_CURVE = new THREE.CatmullRomCurve3(slidePts);

/** Point on the slide at u in [0,1] (arc-length), 0 = spout mouth, 1 = right end. */
export function slideAt(u: number, out: THREE.Vector3): THREE.Vector3 {
  return SLIDE_CURVE.getPointAt(u, out);
}

export const SLIDE_START = SLIDE_CURVE.getPointAt(0, new THREE.Vector3());
export const SLIDE_END = SLIDE_CURVE.getPointAt(1, new THREE.Vector3());
export const SLIDE_END_POS: [number, number, number] = [
  SLIDE_END.x,
  SLIDE_END.y,
  SLIDE_END.z,
];

/** Final display spot: centred in front of the drum, facing the viewer. */
export const DISPLAY = new THREE.Vector3(0, -0.3, 3.6);
