// VTID-04995 — the overlap check waits for the pickers to settle, asks once for
// the settled slot, skips an empty/inverted slot, and a failed check is silent.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const fetchMock = vi.fn();
vi.mock('@/lib/calendar-window-client', () => ({ fetchCalendarConflicts: (...a: unknown[]) => fetchMock(...a) }));

import { useOverlap } from './useOverlap';

const A = new Date('2026-10-10T09:00:00Z');
const B = new Date('2026-10-10T10:00:00Z');
const hit = { kind: 'own', title: 'Yoga', start_time: A.toISOString(), end_time: B.toISOString() };

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('useOverlap (VTID-04995)', () => {
  it('asks once after the slot settles and returns what overlaps', async () => {
    fetchMock.mockResolvedValue([hit]);
    const { result, rerender } = renderHook(({ s, e }) => useOverlap(s, e, 'community', 'ev1'), { initialProps: { s: A, e: B } });
    rerender({ s: new Date(A.getTime() + 900_000), e: B });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][2]).toBe('community');
    expect(fetchMock.mock.calls[0][3]).toBe('ev1');
    expect(result.current).toEqual([hit]);
  });

  it('does not ask for an inverted or missing slot', async () => {
    renderHook(() => useOverlap(B, A, null));
    renderHook(() => useOverlap(null, null, null));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows nothing when the check fails', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const { result } = renderHook(() => useOverlap(A, B, null));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current).toEqual([]);
  });
});
