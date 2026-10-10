/**
 * VTID-04915 — what a member may do with one calendar entry.
 */
import { describe, expect, it } from "vitest";
import type { CalendarEntry, CalendarWindowItem } from "@/lib/calendar-window-client";
import { topPillarGain } from "@/lib/calendar-window-client";
import { canEditEntry, canRemoveEntry, communityEventIdOf, entryTimeState, isEndedSourceEntry, sourceActionOf } from "./entry-actions";

const START = "2026-10-10T10:00:00Z";
const END = "2026-10-10T11:00:00Z";

function item(over: Partial<CalendarEntry> = {}, itemOver: Partial<CalendarWindowItem> = {}): CalendarWindowItem {
  const event: CalendarEntry = {
    id: "e1", title: "Walk", description: null, start_time: START, end_time: END, location: null,
    event_type: "personal", status: "confirmed", source_type: "manual", source_ref_type: null, source_ref_id: null,
    role_context: "community", completion_status: null, completed_at: null, wellness_tags: null, pillar: null,
    rrule: null, emoji: null, attendees_count: null, metadata: null, ...over,
  };
  return { id: "e1", event_id: "e1", start_time: START, end_time: END, busy: false, occurrence_index: null, event, ...itemOver };
}

describe("edit and remove (VTID-04915)", () => {
  it("own one-off entries can be edited and removed", () => {
    expect(canEditEntry(item())).toBe(true);
    expect(canRemoveEntry(item())).toBe(true);
    expect(canEditEntry(item({ source_type: "invite" }))).toBe(true);
  });

  it("an assistant entry can be removed but not rewritten", () => {
    const a = item({ source_type: "assistant" });
    expect(canEditEntry(a)).toBe(false);
    expect(canRemoveEntry(a)).toBe(true);
  });

  it("entries a source owns are changed at the source", () => {
    for (const source_type of ["community_rsvp", "live_room", "autopilot", "goal_plan", "health_plan", "lab_order", "appointment", "journey", "reminder", "subscription", "test_result"]) {
      expect(canEditEntry(item({ source_type }))).toBe(false);
      expect(canRemoveEntry(item({ source_type }))).toBe(false);
    }
  });

  it("no edit for series, occurrences, done or cancelled; nothing for busy or work items", () => {
    expect(canEditEntry(item({ rrule: "FREQ=DAILY" }))).toBe(false);
    expect(canRemoveEntry(item({ rrule: "FREQ=DAILY" }))).toBe(true);
    expect(canEditEntry(item({}, { occurrence_index: 2 }))).toBe(false);
    expect(canEditEntry(item({ completion_status: "completed", completed_at: START }))).toBe(false);
    expect(canEditEntry(item({ status: "cancelled" }))).toBe(false);
    expect(canRemoveEntry(item({ status: "cancelled" }))).toBe(false);
    expect(canRemoveEntry(item({}, { busy: true }))).toBe(false);
    expect(canRemoveEntry(item({}, { work: { kind: "ticket_due", source_id: "t", params: {} } }))).toBe(false);
  });
});

describe("back to the source (VTID-04915)", () => {
  const now = new Date("2026-10-10T09:00:00Z");

  it("a community event entry opens its event, from the trigger row or a legacy client row", () => {
    const trig = item({ source_type: "community_rsvp", source_ref_type: "community_event", source_ref_id: "ev-1" });
    expect(communityEventIdOf(trig)).toBe("ev-1");
    expect(sourceActionOf(trig, now)).toEqual({ kind: "event", eventId: "ev-1", path: "/comm/events-meetups?event=ev-1" });
    const legacy = item({ metadata: { meetup_id: "ev-2" } });
    expect(sourceActionOf(legacy, now)).toMatchObject({ kind: "event", eventId: "ev-2" });
  });

  it("a live room session opens the room, joinable from 15 minutes before until the end", () => {
    const lr = item({ source_type: "live_room", source_ref_type: "live_room_session", source_ref_id: "s1", metadata: { live_room_id: "room-9" } });
    expect(sourceActionOf(lr, new Date("2026-10-10T09:44:00Z"))).toEqual({ kind: "live_room", roomId: "room-9", path: "/comm/live-rooms/room-9/view", joinable: false });
    expect(sourceActionOf(lr, new Date("2026-10-10T09:45:00Z"))).toMatchObject({ joinable: true });
    expect(sourceActionOf(lr, new Date("2026-10-10T11:00:00Z"))).toMatchObject({ joinable: true });
    expect(sourceActionOf(lr, new Date("2026-10-10T11:01:00Z"))).toMatchObject({ joinable: false });
  });

  it("other entries, busy blocks and work items have no source action", () => {
    expect(sourceActionOf(item(), now)).toBeNull();
    expect(sourceActionOf(item({ metadata: { meetup_id: "x" } }, { busy: true }), now)).toBeNull();
    expect(sourceActionOf(item({ source_ref_type: "live_room_session", metadata: {} }), now)).toBeNull();
  });
});

describe("Vitana Index gain (VTID-04915)", () => {
  it("picks the pillar that went up most, nothing when none went up", () => {
    expect(topPillarGain({ per_pillar_delta: { mental: 0.4, exercise: 1.2, sleep: -1 } })).toEqual({ pillar: "exercise", points: 1.2 });
    expect(topPillarGain({ per_pillar_delta: { mental: 0, sleep: -1 } })).toBeNull();
    expect(topPillarGain(null)).toBeNull();
    expect(topPillarGain({})).toBeNull();
  });
});

describe("ended events (VTID-04951)", () => {
  const room = (over: Partial<CalendarEntry> = {}, itemOver: Partial<CalendarWindowItem> = {}) =>
    item(
      { source_type: "live_room", source_ref_type: "live_room_session", source_ref_id: "s1", metadata: { live_room_id: "r1" }, ...over },
      itemOver,
    );

  it("tells upcoming, live and ended apart, with the end itself still live", () => {
    expect(entryTimeState(room(), new Date("2026-10-10T09:59:00Z"))).toBe("upcoming");
    expect(entryTimeState(room(), new Date("2026-10-10T10:30:00Z"))).toBe("live");
    expect(entryTimeState(room(), new Date("2026-10-10T11:00:00Z"))).toBe("live");
    expect(entryTimeState(room(), new Date("2026-10-10T11:00:01Z"))).toBe("ended");
  });

  it("without an end time it runs one hour, like the join window", () => {
    const noEnd = room({ end_time: null }, { end_time: null });
    expect(entryTimeState(noEnd, new Date("2026-10-10T10:59:00Z"))).toBe("live");
    expect(entryTimeState(noEnd, new Date("2026-10-10T11:01:00Z"))).toBe("ended");
  });

  it("an unparsable start is never ended", () => {
    expect(entryTimeState(room({}, { start_time: "nope", end_time: null }), new Date("2030-01-01T00:00:00Z"))).toBe("upcoming");
  });

  it("only events and live rooms count as ended entries — not a personal task", () => {
    const later = new Date("2026-10-11T08:00:00Z");
    expect(isEndedSourceEntry(room(), later)).toBe(true);
    const ev = item({ source_type: "community_rsvp", source_ref_type: "community_event", source_ref_id: "ev-1" });
    expect(isEndedSourceEntry(ev, later)).toBe(true);
    expect(isEndedSourceEntry(item(), later)).toBe(false);
    expect(isEndedSourceEntry(room(), new Date("2026-10-10T10:30:00Z"))).toBe(false);
    expect(isEndedSourceEntry(room({}, { busy: true }), later)).toBe(false);
  });
});
