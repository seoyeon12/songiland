import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

function matchesMobile(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(MOBILE_QUERY).matches;
}

export type PawMode = {
  /** Paw mode is offered only at the mobile breakpoint. */
  available: boolean;
  /** The toggle position. */
  enabled: boolean;
  /** Effective mode: on only when available AND enabled. */
  pawMode: boolean;
  setEnabled: (next: boolean) => void;
};

/**
 * Owns the mobile-only "발바닥 모드" toggle. On desktop it stays unavailable and
 * inert; the effective `pawMode` gates the empty-stage-touch reveal path.
 */
export function usePawMode(): PawMode {
  const [available, setAvailable] = useState(matchesMobile);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia(MOBILE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setAvailable(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return {
    available,
    enabled,
    pawMode: available && enabled,
    setEnabled,
  };
}
