/**
 * VTID-05081 (amendment A2) — the mobile inbox renders its first conversations
 * at once and the rest over idle callbacks, ending with the full list.
 */
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProgressiveCount } from './useProgressiveCount';

// One idle callback per act(), so React commits and schedules the next one.
const flushIdle = (times: number) => {
  for (let i = 0; i < times; i++) act(() => void vi.advanceTimersByTime(50));
};

// Loose view of window so the test can swap the idle-callback API.
type IdleWindow = { requestIdleCallback?: unknown; cancelIdleCallback?: unknown };

describe('useProgressiveCount (VTID-05081 A2)', () => {
  let saved: { ric: unknown; cic: unknown };
  beforeEach(() => {
    vi.useFakeTimers();
    const w = window as unknown as IdleWindow;
    saved = { ric: w.requestIdleCallback, cic: w.cancelIdleCallback };
    // Idle callbacks run as timers, so the test controls when they fire.
    w.requestIdleCallback = (cb: () => void) => window.setTimeout(cb, 1) as unknown as number;
    w.cancelIdleCallback = (id: number) => window.clearTimeout(id);
  });
  afterEach(() => {
    const w = window as unknown as IdleWindow;
    w.requestIdleCallback = saved.ric;
    w.cancelIdleCallback = saved.cic;
    vi.useRealTimers();
  });

  it('starts at the initial cap and grows by step per idle callback to the total', () => {
    const { result } = renderHook(() => useProgressiveCount(213, { initial: 24, step: 40 }));
    expect(result.current).toBe(24);
    flushIdle(1);
    expect(result.current).toBe(64);
    flushIdle(10);
    expect(result.current).toBe(213);
  });

  it('renders everything at once when the total is below the cap', () => {
    const { result } = renderHook(() => useProgressiveCount(5));
    expect(result.current).toBe(5);
    flushIdle(3);
    expect(result.current).toBe(5);
  });

  it('follows a total that grows after the first render', () => {
    const { result, rerender } = renderHook(({ total }) => useProgressiveCount(total, { initial: 2, step: 3 }), {
      initialProps: { total: 0 },
    });
    expect(result.current).toBe(0);
    rerender({ total: 10 });
    expect(result.current).toBe(2);
    flushIdle(5);
    expect(result.current).toBe(10);
  });

  it('cancels a pending idle callback on unmount', () => {
    const cancel = vi.fn((id: number) => window.clearTimeout(id));
    (window as unknown as IdleWindow).cancelIdleCallback = cancel;
    const { unmount } = renderHook(() => useProgressiveCount(100));
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it('falls back to a timer without requestIdleCallback', () => {
    (window as unknown as IdleWindow).requestIdleCallback = undefined;
    const { result } = renderHook(() => useProgressiveCount(50, { initial: 10, step: 40 }));
    expect(result.current).toBe(10);
    flushIdle(1);
    expect(result.current).toBe(50);
  });
});
