import { renderHook } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { getRevealCue } from './revealCue';
import { useRevealTimeline } from './useRevealTimeline';

const mainCue = getRevealCue(0, false);

afterEach(() => {
  vi.useRealTimers();
});

it('calls onRevealFinished once after the configured duration', () => {
  vi.useFakeTimers();
  const onRevealFinished = vi.fn();
  renderHook(() =>
    useRevealTimeline({ cue: mainCue, active: true, onFinished: onRevealFinished }),
  );
  vi.advanceTimersByTime(1_200);
  expect(onRevealFinished).toHaveBeenCalledOnce();
});

it('does not fire while inactive', () => {
  vi.useFakeTimers();
  const onFinished = vi.fn();
  renderHook(() =>
    useRevealTimeline({ cue: mainCue, active: false, onFinished }),
  );
  vi.advanceTimersByTime(5_000);
  expect(onFinished).not.toHaveBeenCalled();
});

it('fires only once even when the component re-renders mid-animation', () => {
  vi.useFakeTimers();
  const onFinished = vi.fn();
  const { rerender } = renderHook(
    ({ onFinishedProp }) =>
      useRevealTimeline({
        cue: mainCue,
        active: true,
        onFinished: onFinishedProp,
      }),
    { initialProps: { onFinishedProp: onFinished } },
  );
  vi.advanceTimersByTime(600);
  rerender({ onFinishedProp: onFinished });
  rerender({ onFinishedProp: onFinished });
  vi.advanceTimersByTime(600);
  expect(onFinished).toHaveBeenCalledOnce();
});

it('cancels its timer on unmount', () => {
  vi.useFakeTimers();
  const onFinished = vi.fn();
  const { unmount } = renderHook(() =>
    useRevealTimeline({ cue: mainCue, active: true, onFinished }),
  );
  unmount();
  vi.advanceTimersByTime(2_000);
  expect(onFinished).not.toHaveBeenCalled();
});
