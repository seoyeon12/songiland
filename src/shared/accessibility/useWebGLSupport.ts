import { useState } from 'react';

/** True only if the browser can create a WebGL2 or WebGL rendering context. */
export function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') || canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}

export function useWebGLSupport(): boolean {
  // Capability is fixed for the session; detect once on mount.
  const [supported] = useState(detectWebGLSupport);
  return supported;
}
