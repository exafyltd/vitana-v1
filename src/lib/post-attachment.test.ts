/**
 * VTID-04916 — reading the shared event off a post and loading its state.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ rows: {} as Record<string, unknown>, calls: [] as string[] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      h.calls.push(table);
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: h.rows[table] ?? null, error: null }),
      };
      return q;
    },
  },
}));

import { attachedEventStateOf, attachedRefOf, fetchAttachedEvent } from "./post-attachment";

const ID = "3f1c2a54-8a51-4c8e-9e0a-0d6b6a1f2c11";
const ROOM = "7a0e1f22-1111-4c8e-9e0a-0d6b6a1f2c22";
const NOW = new Date("2026-10-08T10:00:00Z");

describe("attachedRefOf", () => {
  it("reads both columns, or nothing", () => {
    expect(attachedRefOf({ attached_ref_type: "community_event", attached_ref_id: ID })).toEqual({ type: "community_event", id: ID });
    expect(attachedRefOf({ attached_ref_type: "live_room_session", attached_ref_id: ID })).toEqual({ type: "live_room_session", id: ID });
    expect(attachedRefOf({})).toBeNull(); // rows from before the migration
    expect(attachedRefOf(null)).toBeNull();
    expect(attachedRefOf({ attached_ref_type: "community_event", attached_ref_id: null })).toBeNull();
    expect(attachedRefOf({ attached_ref_type: "health_plan", attached_ref_id: ID })).toBeNull();
    expect(attachedRefOf({ attached_ref_type: "community_event", attached_ref_id: "not-a-uuid" })).toBeNull();
  });
});

describe("attachedEventStateOf", () => {
  it("upcoming, live, past, cancelled", () => {
    expect(attachedEventStateOf("2026-10-09T10:00:00Z", null, null, NOW)).toBe("upcoming");
    expect(attachedEventStateOf("2026-10-08T09:30:00Z", "2026-10-08T11:00:00Z", null, NOW)).toBe("live");
    expect(attachedEventStateOf("2026-10-08T09:30:00Z", null, null, NOW)).toBe("live"); // one hour by default
    expect(attachedEventStateOf("2026-10-08T08:00:00Z", null, null, NOW)).toBe("past");
    expect(attachedEventStateOf("2026-10-07T10:00:00Z", "2026-10-07T11:00:00Z", null, NOW)).toBe("past");
    expect(attachedEventStateOf("2026-10-09T10:00:00Z", null, "cancelled", NOW)).toBe("cancelled");
    expect(attachedEventStateOf("2026-10-09T10:00:00Z", null, "ended", NOW)).toBe("past");
    expect(attachedEventStateOf("2026-10-09T10:00:00Z", null, "live", NOW)).toBe("live");
  });
});

describe("fetchAttachedEvent", () => {
  beforeEach(() => {
    h.rows = {};
    h.calls = [];
  });

  it("a community event opens its event page", async () => {
    h.rows.global_community_events = { title: "Yoga im Park", start_time: "2026-10-09T08:00:00Z", end_time: null, location: "Tiergarten" };
    expect(await fetchAttachedEvent({ type: "community_event", id: ID }, NOW)).toEqual({
      title: "Yoga im Park", start_time: "2026-10-09T08:00:00Z", end_time: null, location: "Tiergarten",
      state: "upcoming", path: `/comm/events-meetups?event=${ID}`,
    });
  });

  it("a live session opens its room and falls back to the room title", async () => {
    h.rows.live_room_sessions = { room_id: ROOM, session_title: null, status: "scheduled", starts_at: "2026-10-08T09:50:00Z", ends_at: "2026-10-08T11:00:00Z" };
    h.rows.live_rooms = { title: "Ruhiger Raum" };
    const ev = await fetchAttachedEvent({ type: "live_room_session", id: ID }, NOW);
    expect(ev).toMatchObject({ title: "Ruhiger Raum", state: "live", path: `/comm/live-rooms/${ROOM}/view`, location: null });
    expect(h.calls).toEqual(["live_room_sessions", "live_rooms"]);
  });

  it("a cancelled session says so; a session with its own title does not look up the room", async () => {
    h.rows.live_room_sessions = { room_id: ROOM, session_title: "Atemübung", status: "cancelled", starts_at: "2026-10-09T09:00:00Z", ends_at: null };
    const ev = await fetchAttachedEvent({ type: "live_room_session", id: ID }, NOW);
    expect(ev).toMatchObject({ title: "Atemübung", state: "cancelled" });
    expect(h.calls).toEqual(["live_room_sessions"]);
  });

  it("a deleted or hidden event is null", async () => {
    expect(await fetchAttachedEvent({ type: "community_event", id: ID }, NOW)).toBeNull();
    expect(await fetchAttachedEvent({ type: "live_room_session", id: ID }, NOW)).toBeNull();
  });
});
