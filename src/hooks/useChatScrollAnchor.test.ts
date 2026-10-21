/**
 * VTID-05319 (messenger-ux-v2/ui-scroll-anchoring) — new messages without
 * forced scrolling.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatScrollAnchor, distanceFromBottom, arrivedBelow, type AnchorRow } from './useChatScrollAnchor';

type Props = { key: string; rows: AnchorRow[]; atBottom: boolean };

// Rows accumulate per conversation like a real list: L('m3') = m1..m3 when
// the ids are numbered, else a list ending in that row.
let clock = 0;
const seen = new Map<string, AnchorRow>();
function L(id: string, sender: string): AnchorRow[] {
  if (!seen.has(id)) seen.set(id, { id, sender_id: sender, created_at: new Date(2026, 9, 21, 10, 0, clock++).toISOString() });
  const prefix = id.replace(/\d+$/, '');
  const list = [...seen.values()].filter((r) => r.id.replace(/\d+$/, '') === prefix || r.id === id);
  return list.slice(0, list.findIndex((r) => r.id === id) + 1);
}

function setup(initial: Props) {
  const follow = vi.fn();
  const state = { atBottom: initial.atBottom };
  const r = renderHook(
    (p: Props) => {
      state.atBottom = p.atBottom;
      return useChatScrollAnchor({
        conversationKey: p.key,
        rows: p.rows,
        meId: 'me',
        isAtBottom: () => state.atBottom,
        follow,
      });
    },
    { initialProps: initial },
  );
  return { ...r, follow, state };
}

describe('useChatScrollAnchor', () => {
  it('distanceFromBottom', () => {
    expect(distanceFromBottom({ scrollHeight: 1000, scrollTop: 600, clientHeight: 300 })).toBe(100);
    expect(distanceFromBottom(null)).toBe(0);
  });

  it('at the bottom, a new message keeps the view anchored to the newest one', () => {
    const { rerender, follow, result } = setup({ key: 'a', rows: L('m1', 'peer'), atBottom: true });
    expect(follow).not.toHaveBeenCalled(); // the opening position is the view's job
    rerender({ key: 'a', rows: L('m2', 'peer'), atBottom: true });
    expect(follow).toHaveBeenCalledTimes(1);
    expect(result.current.newCount).toBe(0);
  });

  it('while reading earlier messages, new ones are counted and the view does not move', () => {
    const { rerender, follow, result } = setup({ key: 'a', rows: L('m1', 'peer'), atBottom: true });
    act(() => result.current.markAway());
    rerender({ key: 'a', rows: L('m2', 'peer'), atBottom: false });
    rerender({ key: 'a', rows: L('m3', 'peer'), atBottom: false });
    expect(follow).not.toHaveBeenCalled();
    expect(result.current.newCount).toBe(2);
  });

  it('my own new message always brings me to the bottom', () => {
    const { rerender, follow, result } = setup({ key: 'a', rows: L('m1', 'peer'), atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', rows: L('mine', 'me'), atBottom: false });
    expect(follow).toHaveBeenCalledTimes(1);
    expect(result.current.newCount).toBe(0);
  });

  it('scrolling back to the bottom or tapping the pill clears the count', () => {
    const { rerender, follow, result, state } = setup({ key: 'a', rows: L('m1', 'peer'), atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', rows: L('m2', 'peer'), atBottom: false });
    expect(result.current.newCount).toBe(1);
    state.atBottom = true;
    act(() => result.current.onScroll());
    expect(result.current.newCount).toBe(0);

    state.atBottom = false;
    act(() => result.current.onScroll());
    rerender({ key: 'a', rows: L('m3', 'peer'), atBottom: false });
    expect(result.current.newCount).toBe(1);
    act(() => result.current.jumpToLatest());
    expect(follow).toHaveBeenCalledTimes(1);
    expect(result.current.newCount).toBe(0);
  });

  it('paging back (older rows prepended, same newest) is not a new message', () => {
    const { rerender, follow, result } = setup({ key: 'a', rows: L('m9', 'peer'), atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', rows: L('m9', 'peer'), atBottom: false });
    expect(follow).not.toHaveBeenCalled();
    expect(result.current.newCount).toBe(0);
  });

  it('another conversation starts fresh', () => {
    const { rerender, result } = setup({ key: 'a', rows: L('m1', 'peer'), atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', rows: L('m2', 'peer'), atBottom: false });
    expect(result.current.newCount).toBe(1);
    rerender({ key: 'b', rows: L('x1', 'peer'), atBottom: true });
    expect(result.current.newCount).toBe(0);
  });

  const r = (id: string, min: number, extra: Partial<AnchorRow> = {}): AnchorRow => ({
    id, sender_id: 'peer', created_at: new Date(2026, 9, 21, 11, min).toISOString(), ...extra,
  });

  it('several messages arriving in one update are all counted', () => {
    const { rerender, result } = setup({ key: 'c', rows: [r('a', 0)], atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'c', rows: [r('a', 0), r('b', 1), r('c', 2), r('d', 3)], atBottom: false });
    expect(result.current.newCount).toBe(3);
  });

  it('deleting the newest message is not a new message', () => {
    const { rerender, follow, result } = setup({ key: 'd', rows: [r('a', 0), r('b', 1)], atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'd', rows: [r('a', 0)], atBottom: false });
    expect(result.current.newCount).toBe(0);
    expect(follow).not.toHaveBeenCalled();
  });

  it('my unsent row getting its server id (same client_message_id) does not scroll me down', () => {
    const cid = 'cid-1';
    const { rerender, follow, result } = setup({
      key: 'e', rows: [r('a', 0), r('temp-cid-1', 1, { sender_id: 'me', client_message_id: cid })], atBottom: false,
    });
    act(() => result.current.markAway());
    rerender({ key: 'e', rows: [r('a', 0), r('srv-1', 1, { sender_id: 'me', client_message_id: cid })], atBottom: false });
    expect(follow).not.toHaveBeenCalled();
    expect(result.current.newCount).toBe(0);
  });

  it('arrivedBelow: rows below the former bottom row, or newer than it when it is gone', () => {
    expect(arrivedBelow([r('a', 0), r('b', 1), r('c', 2)], r('a', 0)).map((x) => x.id)).toEqual(['b', 'c']);
    expect(arrivedBelow([r('a', 0), r('c', 2)], r('b', 1)).map((x) => x.id)).toEqual(['c']);
    expect(arrivedBelow([r('a', 0)], r('b', 1))).toEqual([]);
    expect(arrivedBelow([r('a', 0)], r('a', 0))).toEqual([]);
  });
});
