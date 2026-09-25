/** VTID-04520 — the overlay bus acknowledges, and hands early requests to late listeners. */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { __clearPendingOverlays, openOverlay, takePendingOverlay, useWindowOverlay } from './overlay-bus';

afterEach(() => __clearPendingOverlays());

describe('overlay bus', () => {
  it('reports acknowledged when a useWindowOverlay listener is mounted', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useWindowOverlay('test:open', handler));
    expect(openOverlay('test:open', { tab: 'x' })).toBe('acknowledged');
    expect(handler).toHaveBeenCalledWith({ tab: 'x' });
    unmount();
  });

  it('queues a request nobody heard and delivers it when the listener mounts', () => {
    expect(openOverlay('late:open', { section: 'privacy' })).toBe('queued');
    const handler = vi.fn();
    renderHook(() => useWindowOverlay('late:open', handler));
    expect(handler).toHaveBeenCalledWith({ section: 'privacy' });
    expect(takePendingOverlay('late:open')).toBeUndefined(); // one-shot
  });

  it('drops a queued request once it is stale', () => {
    openOverlay('stale:open', {});
    expect(takePendingOverlay('stale:open', Date.now() + 60_000)).toBeUndefined();
  });

  it('does not listen while disabled', () => {
    const handler = vi.fn();
    renderHook(() => useWindowOverlay('off:open', handler, false));
    expect(openOverlay('off:open')).toBe('queued');
    expect(handler).not.toHaveBeenCalled();
  });

  it('plain listeners still receive the event, but cannot acknowledge', () => {
    const plain = vi.fn();
    window.addEventListener('plain:open', plain);
    expect(openOverlay('plain:open')).toBe('queued');
    expect(plain).toHaveBeenCalled();
    window.removeEventListener('plain:open', plain);
  });
});
