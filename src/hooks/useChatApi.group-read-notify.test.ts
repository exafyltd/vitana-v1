import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { markGroupReadAndNotify } from "@/hooks/useChatApi";

// Regression: opening a group marked it read on the server but never told the
// footer badge to recompute, so the badge only caught up on its 60s reconcile.
describe("markGroupReadAndNotify", () => {
  let received: Event[];
  const onBadgeUpdate = (event: Event) => {
    received.push(event);
  };

  beforeEach(() => {
    received = [];
    window.addEventListener("chat-unread-count-update", onBadgeUpdate);
  });

  afterEach(() => {
    window.removeEventListener("chat-unread-count-update", onBadgeUpdate);
  });

  it("marks the group read and dispatches the badge update after success", async () => {
    const markRead = vi.fn().mockResolvedValue(undefined);

    await markGroupReadAndNotify("group-1", markRead);

    expect(markRead).toHaveBeenCalledWith("group-1");
    expect(received).toHaveLength(1);
    expect((received[0] as CustomEvent).detail).toEqual({ groupId: "group-1" });
  });

  it("does not dispatch the badge update when the read fails", async () => {
    const markRead = vi.fn().mockRejectedValue(new Error("network"));

    await expect(markGroupReadAndNotify("group-1", markRead)).rejects.toThrow("network");
    expect(received).toHaveLength(0);
  });
});
