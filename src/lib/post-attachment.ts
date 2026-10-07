/**
 * VTID-04916 — the event a feed post shares.
 *
 * A member going to a community event or a live room session can post it to
 * the feed from the calendar. The post row carries attached_ref_type /
 * attached_ref_id (set only by the gateway's share-to-feed route); the feed
 * renders a live card for it. This file reads the reference off a row and
 * loads the event's current state, so a card never shows a cancelled or
 * finished event as if it were still on.
 */
import { supabase } from "@/integrations/supabase/client";

export type PostAttachedRefType = "community_event" | "live_room_session";

export interface PostAttachedRef {
  type: PostAttachedRefType;
  id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The shared event on a profile_posts row, or null (rows from before the migration have neither column). */
export function attachedRefOf(row: { attached_ref_type?: unknown; attached_ref_id?: unknown } | null | undefined): PostAttachedRef | null {
  if (!row) return null;
  const type = row.attached_ref_type;
  const id = row.attached_ref_id;
  if ((type !== "community_event" && type !== "live_room_session") || typeof id !== "string" || !UUID_RE.test(id)) return null;
  return { type, id };
}

export type AttachedEventState = "upcoming" | "live" | "past" | "cancelled";

export interface AttachedEvent {
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  state: AttachedEventState;
  /** Where the card's button goes: the event (RSVP, tickets) or the live room. */
  path: string;
}

const DEFAULT_LENGTH_MS = 60 * 60_000;

/** Upcoming, live, past or cancelled — from the event's own times and status. */
export function attachedEventStateOf(
  start: string,
  end: string | null,
  status: string | null,
  now: Date,
): AttachedEventState {
  if (status === "cancelled") return "cancelled";
  if (status === "ended") return "past";
  const s = Date.parse(start);
  const e = end ? Date.parse(end) : s + DEFAULT_LENGTH_MS;
  const t = now.getTime();
  if (Number.isFinite(e) && t >= e) return "past";
  if (status === "live" || (Number.isFinite(s) && t >= s)) return "live";
  return "upcoming";
}

/** Loads the shared event as the viewer may see it (RLS); null when it is gone or hidden. */
export async function fetchAttachedEvent(ref: PostAttachedRef, now: Date = new Date()): Promise<AttachedEvent | null> {
  if (ref.type === "community_event") {
    const { data, error } = await supabase
      .from("global_community_events" as never)
      .select("id, title, start_time, end_time, location")
      .eq("id", ref.id)
      .maybeSingle();
    if (error) throw error;
    const ev = data as { title: string | null; start_time: string | null; end_time: string | null; location: string | null } | null;
    if (!ev?.start_time) return null;
    return {
      title: ev.title ?? "",
      start_time: ev.start_time,
      end_time: ev.end_time,
      location: ev.location,
      state: attachedEventStateOf(ev.start_time, ev.end_time, null, now),
      path: `/comm/events-meetups?event=${encodeURIComponent(ref.id)}`,
    };
  }
  const { data, error } = await supabase
    .from("live_room_sessions" as never)
    .select("id, room_id, session_title, status, starts_at, ends_at")
    .eq("id", ref.id)
    .maybeSingle();
  if (error) throw error;
  const s = data as { room_id: string | null; session_title: string | null; status: string | null; starts_at: string | null; ends_at: string | null } | null;
  if (!s?.starts_at || !s.room_id) return null;
  let title = s.session_title ?? "";
  if (!title) {
    const { data: room } = await supabase.from("live_rooms" as never).select("title").eq("id", s.room_id).maybeSingle();
    title = (room as { title: string | null } | null)?.title ?? "";
  }
  return {
    title,
    start_time: s.starts_at,
    end_time: s.ends_at,
    location: null,
    state: attachedEventStateOf(s.starts_at, s.ends_at, s.status, now),
    path: `/comm/live-rooms/${encodeURIComponent(s.room_id)}/view`,
  };
}
