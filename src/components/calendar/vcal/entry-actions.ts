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

export type EntryTimeState = "upcoming" | "live" | "ended";

/**
 * VTID-04951 — where an entry is on the clock. The end is `end_time`, else
 * one hour after the start (the same fallback `sourceActionOf` uses). An
 * unparsable start is never "ended": we would rather offer an action than
 * wrongly tell the member their event is over.
 */
export function entryTimeState(item: CalendarWindowItem, now: Date): EntryTimeState {
  const start = Date.parse(item.start_time);
  if (Number.isNaN(start)) return "upcoming";
  const parsedEnd = item.end_time ? Date.parse(item.end_time) : NaN;
  const end = Number.isNaN(parsedEnd) ? start + 60 * 60_000 : parsedEnd;
  const t = now.getTime();
  if (t > end) return "ended";
  return t >= start ? "live" : "upcoming";
}

/**
 * VTID-04951 — an event or live room whose time has passed. Own personal
 * entries and tasks are never "ended" in this sense: marking a past task
 * done is legitimate, while a finished event has nothing left to join,
 * complete or move.
 */
export function isEndedSourceEntry(item: CalendarWindowItem, now: Date): boolean {
  const e = item.event;
  if (!e || item.busy || item.work) return false;
  const hasSource =
    communityEventIdOf(item) !== null ||
    e.source_ref_type === "live_room_session" ||
    e.source_type === "live_room";
  return hasSource && entryTimeState(item, now) === "ended";
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
