/**
 * VTID-05318 (messenger-ux-v2/ui-reply-jump) — jump to any message (plan I8).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const notifyError = vi.fn();
vi.mock('@/lib/i18n-toast', () => ({ notifyError: (...a: unknown[]) => notifyError(...a) }));

import { useJumpToMessage, unionByIdSorted, bridgeWindow } from './useJumpToMessage';

const scrollIntoView = vi.fn();
beforeEach(() => {
  document.body.innerHTML = '';
  scrollIntoView.mockClear();
  notifyError.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

function addRow(id: string) {
  const el = document.createElement('div');
  el.id = `msg-${id}`;
  document.body.appendChild(el);
  return el;
}

describe('useJumpToMessage', () => {
  it('a loaded message: scrolls it to the middle without animation and highlights it', async () => {
    const el = addRow('m1');
    const loadAround = vi.fn();
    const onJump = vi.fn();
    const { result } = renderHook(() => useJumpToMessage({ loadAround, onJump }));
    let ok = false;
    await act(async () => { ok = await result.current('m1'); });
    expect(ok).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    expect(el.classList.contains('message-highlight')).toBe(true);
    expect(loadAround).not.toHaveBeenCalled();
    expect(onJump).toHaveBeenCalled();
  });

  it('an unloaded message: loads the window around it, then jumps', async () => {
    const loadAround = vi.fn(async (id: string) => { addRow(id); return true; });
    const { result } = renderHook(() => useJumpToMessage({ loadAround }));
    let ok = false;
    await act(async () => { ok = await result.current('old-1'); });
    expect(loadAround).toHaveBeenCalledWith('old-1');
    expect(ok).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('a message the conversation does not have: a toast, no scroll', async () => {
    const loadAround = vi.fn(async () => false);
    const { result } = renderHook(() => useJumpToMessage({ loadAround }));
    let ok = true;
    await act(async () => { ok = await result.current('gone'); });
    expect(ok).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith('inbox.reply.unavailable');
  });
});

describe('window merge', () => {
  const r = (id: string, min: number) => ({ id, created_at: new Date(Date.UTC(2026, 9, 21, 10, min)).toISOString() });

  it('unionByIdSorted keeps one row per id in time order', () => {
    expect(unionByIdSorted([r('b', 2), r('c', 3)], [r('a', 1), r('b', 2)]).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('bridgeWindow fetches forward until the window meets the loaded page', async () => {
    const loaded = [r('m50', 50), r('m51', 51)];
    const window = [r('m10', 10), r('m11', 11)];
    const pages: Record<string, Array<{ id: string; created_at: string }>> = {
      [r('x', 11).created_at]: [r('m20', 20), r('m30', 30)],
      [r('x', 30).created_at]: [r('m40', 40), r('m50', 50)],
    };
    const fetchAfter = vi.fn(async (after: string) => pages[after] ?? []);
    const rows = await bridgeWindow(window, true, loaded, fetchAfter);
    expect(rows.map((x) => x.id)).toEqual(['m10', 'm11', 'm20', 'm30', 'm40', 'm50']);
    expect(fetchAfter).toHaveBeenCalledTimes(2);
  });

  it('bridgeWindow does nothing when the window already reaches the loaded rows', async () => {
    const fetchAfter = vi.fn();
    const rows = await bridgeWindow([r('m49', 49), r('m50', 50)], true, [r('m50', 50)], fetchAfter);
    expect(rows).toHaveLength(2);
    expect(fetchAfter).not.toHaveBeenCalled();
  });
});
