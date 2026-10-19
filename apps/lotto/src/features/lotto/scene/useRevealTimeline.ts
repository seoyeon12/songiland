import { useEffect, useRef } from 'react';
import type { RevealCue } from './revealCue';

/**
 * Runs a single presentational cue and calls `onFinished` exactly once after its
 * duration. The callback is read through a ref updated in an effect, so
 * mid-animation re-renders never restart or double-fire the timeline; only
 * toggling `active` (or a genuinely new duration) starts a new cycle. All timers
 * are cleared on unmount or when `active` flips off.
 */
export function useRevealTimeline(options: {
  cue: RevealCue | null;
  active: boolean;
  onFinished: () => void;
}): void {
  const { cue, active, onFinished } = options;

  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const durationMs = cue?.durationMs ?? null;
  useEffect(() => {
    if (!active || durationMs === null) {
      return;
    }
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) {
        return;
      }
      finished = true;
      onFinishedRef.current();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [active, durationMs]);
}
