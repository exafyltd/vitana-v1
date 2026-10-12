/**
 * VTID-05081 — the unread badge survives a route swap.
 *
 * A tab switch unmounts the old screen's badge and mounts the new one's in the
 * same tick, so the store's listener count touches 0 for a moment. Tearing
 * down there meant a refetch and a re-subscribe on every switch. Teardown now
 * waits one macrotask and re-checks.
 */
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    channel,
    realtimeChannel: vi.fn(() => channel),
    removeRealtimeChannel: vi.fn(),
    fetchUnreadCount: vi.fn(async () => 2),
    fetchGroups: vi.fn(async () => []),
  };
});
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/integrations/supabase/realtime", () => ({
  realtimeChannel: h.realtimeChannel,
  removeRealtimeChannel: h.removeRealtimeChannel,
}));
vi.mock("@/hooks/useChatApi", () => ({ fetchUnreadCount: h.fetchUnreadCount, fetchGroups: h.fetchGroups }));

import { useChatUnreadCount } from "./useChatUnreadCount";

describe("useChatUnreadCount teardown (VTID-05081)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    h.realtimeChannel.mockClear();
    h.removeRealtimeChannel.mockClear();
    h.fetchUnreadCount.mockClear();
    h.fetchGroups.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not refetch or re-subscribe on an unmount + remount in the same tick", async () => {
    const first = renderHook(() => useChatUnreadCount());
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.fetchUnreadCount).toHaveBeenCalledTimes(1);
    expect(h.realtimeChannel).toHaveBeenCalledTimes(1);

    // The route swap: old screen's badge goes, new screen's badge comes.
    first.unmount();
    const second = renderHook(() => useChatUnreadCount());
    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(h.fetchUnreadCount).toHaveBeenCalledTimes(1);
    expect(h.realtimeChannel).toHaveBeenCalledTimes(1);
    expect(h.removeRealtimeChannel).not.toHaveBeenCalled();
    expect(second.result.current.unreadCount).toBe(2);

    // A real unmount (no badge left) still tears the store down.
    second.unmount();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(h.removeRealtimeChannel).toHaveBeenCalledTimes(1);

    // …and the next badge starts fresh.
    const third = renderHook(() => useChatUnreadCount());
    await act(async () => {
      await Promise.resolve();
    });
    expect(h.fetchUnreadCount).toHaveBeenCalledTimes(2);
    third.unmount();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
  });
});
