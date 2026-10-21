/**
 * VTID-05319 (messenger-ux-v2/ui-scroll-anchoring) — new messages without
 * forced scrolling.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatScrollAnchor, distanceFromBottom } from './useChatScrollAnchor';

type Props = { key: string; newest: { id: string; sender_id: string } | null; atBottom: boolean };

function setup(initial: Props) {
  const follow = vi.fn();
  const state = { atBottom: initial.atBottom };
  const r = renderHook(
    (p: Props) => {
      state.atBottom = p.atBottom;
      return useChatScrollAnchor({
        conversationKey: p.key,
        newest: p.newest,
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
    const { rerender, follow, result } = setup({ key: 'a', newest: { id: 'm1', sender_id: 'peer' }, atBottom: true });
    expect(follow).not.toHaveBeenCalled(); // the opening position is the view's job
    rerender({ key: 'a', newest: { id: 'm2', sender_id: 'peer' }, atBottom: true });
    expect(follow).toHaveBeenCalledTimes(1);
    expect(result.current.newCount).toBe(0);
  });

  it('while reading earlier messages, new ones are counted and the view does not move', () => {
    const { rerender, follow, result } = setup({ key: 'a', newest: { id: 'm1', sender_id: 'peer' }, atBottom: true });
    act(() => result.current.markAway());
    rerender({ key: 'a', newest: { id: 'm2', sender_id: 'peer' }, atBottom: false });
    rerender({ key: 'a', newest: { id: 'm3', sender_id: 'peer' }, atBottom: false });
    expect(follow).not.toHaveBeenCalled();
    expect(result.current.newCount).toBe(2);
  });

  it('my own new message always brings me to the bottom', () => {
    const { rerender, follow, result } = setup({ key: 'a', newest: { id: 'm1', sender_id: 'peer' }, atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', newest: { id: 'mine', sender_id: 'me' }, atBottom: false });
    expect(follow).toHaveBeenCalledTimes(1);
    expect(result.current.newCount).toBe(0);
  });

  it('scrolling back to the bottom or tapping the pill clears the count', () => {
    const { rerender, follow, result, state } = setup({ key: 'a', newest: { id: 'm1', sender_id: 'peer' }, atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', newest: { id: 'm2', sender_id: 'peer' }, atBottom: false });
    expect(result.current.newCount).toBe(1);
    state.atBottom = true;
    act(() => result.current.onScroll());
    expect(result.current.newCount).toBe(0);

    state.atBottom = false;
    act(() => result.current.onScroll());
    rerender({ key: 'a', newest: { id: 'm3', sender_id: 'peer' }, atBottom: false });
    expect(result.current.newCount).toBe(1);
    act(() => result.current.jumpToLatest());
    expect(follow).toHaveBeenCalledTimes(1);
    expect(result.current.newCount).toBe(0);
  });

  it('paging back (older rows prepended, same newest) is not a new message', () => {
    const { rerender, follow, result } = setup({ key: 'a', newest: { id: 'm9', sender_id: 'peer' }, atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', newest: { id: 'm9', sender_id: 'peer' }, atBottom: false });
    expect(follow).not.toHaveBeenCalled();
    expect(result.current.newCount).toBe(0);
  });

  it('another conversation starts fresh', () => {
    const { rerender, result } = setup({ key: 'a', newest: { id: 'm1', sender_id: 'peer' }, atBottom: false });
    act(() => result.current.markAway());
    rerender({ key: 'a', newest: { id: 'm2', sender_id: 'peer' }, atBottom: false });
    expect(result.current.newCount).toBe(1);
    rerender({ key: 'b', newest: { id: 'x1', sender_id: 'peer' }, atBottom: true });
    expect(result.current.newCount).toBe(0);
  });
});
