/**
 * VTID-04915 — what a member can do with one calendar entry.
 *
 * Pure rules, so the entry screen and its tests agree:
 *   - Edit: only entries the member made themselves (manual, an accepted
 *     invite), one-off, not done, not cancelled. Entries an assistant made
 *     can be moved or removed, never rewritten into something else (the
 *     VTID-04604 write guard exists because the model once created entries
 *     nobody asked for). Entries a source owns (an event sign-up, a live
 *     room, a plan, a booking) are changed at their source.
 *   - Remove: the member's own, an invite, or an assistant entry.
 *   - Open source: a community event opens its event; a live room session
 *     opens the room, and "Join" is offered from 15 minutes before it starts
 *     until it ends.
 */
import type { CalendarWindowItem } from "@/lib/calendar-window-client";
import { isDone } from "./theme";

const EDITABLE_SOURCES = new Set(["manual", "invite"]);
const REMOVABLE_SOURCES = new Set(["manual", "invite", "assistant"]);
const JOIN_EARLY_MS = 15 * 60_000;

function ownEntry(item: CalendarWindowItem): boolean {
  const e = item.event;
  return !!e && !item.busy && !item.work && e.status !== "cancelled";
}

export function canEditEntry(item: CalendarWindowItem): boolean {
  const e = item.event;
  return (
    ownEntry(item) &&
    !!e &&
    EDITABLE_SOURCES.has(e.source_type) &&
    !e.rrule &&
    item.occurrence_index === null &&
    !isDone(e)
  );
}

export function canRemoveEntry(item: CalendarWindowItem): boolean {
  return ownEntry(item) && REMOVABLE_SOURCES.has(item.event!.source_type);
}

export type SourceAction =
  | { kind: "event"; eventId: string; path: string }
  | { kind: "live_room"; roomId: string; path: string; joinable: boolean };

/** The community event this entry belongs to, if any (trigger rows and legacy client rows alike). */
export function communityEventIdOf(item: CalendarWindowItem): string | null {
  const e = item.event;
  if (!e) return null;
  if (e.source_ref_type === "community_event" && e.source_ref_id) return String(e.source_ref_id);
  const meetup = e.metadata?.meetup_id;
  return typeof meetup === "string" && meetup ? meetup : null;
}

export function sourceActionOf(item: CalendarWindowItem, now: Date): SourceAction | null {
  const e = item.event;
  if (!e || item.busy || item.work) return null;
  const eventId = communityEventIdOf(item);
  if (eventId) {
    return { kind: "event", eventId, path: `/comm/events-meetups?event=${encodeURIComponent(eventId)}` };
  }
  const roomId = e.metadata?.live_room_id;
  if (e.source_ref_type === "live_room_session" && typeof roomId === "string" && roomId) {
    const start = Date.parse(item.start_time);
    const end = item.end_time ? Date.parse(item.end_time) : start + 60 * 60_000;
    const t = now.getTime();
    return {
      kind: "live_room",
      roomId,
      path: `/comm/live-rooms/${encodeURIComponent(roomId)}/view`,
      joinable: e.status !== "cancelled" && t >= start - JOIN_EARLY_MS && t <= end,
    };
  }
  return null;
}
