/**
 * VTID-04351 — client for the gateway calendar window read.
 *
 * GET  /api/v1/calendar/events/window?from&to  (VTID-04331)
 *   Everything the calendar shows in a range for the active role: recurring
 *   entries expanded into occurrences, entries from other roles as grey busy
 *   blocks that carry time only. Each visible entry also carries the emoji and
 *   the reminders the gateway's reminder loop will actually write (VTID-04338),
 *   so the screen never promises a different reminder time than the one sent.
 *
 * POST /api/v1/calendar/events/:id/complete
 *   Ticks an entry off. The gateway completes the source too (an Autopilot
 *   recommendation, for example).
 */

import { getAccessToken } from "@/lib/cached-access-token";

const RAW_GATEWAY = (import.meta.env.VITE_GATEWAY_URL as string | undefined) || "";
// vitana-v1's .env includes /api/v1 — strip it so paths below stay explicit.
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export type ReminderRule =
  | { kind: "before"; minutes: number }
  | { kind: "evening_before"; hour: number };

export interface CalendarEntry {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  event_type: string;
  status: string;
  source_type: string;
  source_ref_type: string | null;
  source_ref_id?: string | null;
  role_context: string;
  completion_status: string | null;
  completed_at: string | null;
  wellness_tags: string[] | null;
  pillar: string | null;
  rrule: string | null;
  emoji: string | null;
  attendees_count: number | null;
  metadata: Record<string, unknown> | null;
}

export interface CalendarWindowItem {
  id: string;
  event_id: string;
  start_time: string;
  end_time: string | null;
  busy: boolean;
  occurrence_index: number | null;
  event: CalendarEntry | null;
  display_emoji?: string;
  reminders?: ReminderRule[];
  /**
   * VTID-04357: set on developer/admin work-lens items (deploys, reviews,
   * ticket deadlines, approvals). They are read-only views of their own
   * tables — never completed from the calendar. `event.title` is an
   * identifier (commit, ticket number); the label comes from `vcal.work.<kind>`.
   */
  work?: WorkDescriptor;
  /** VTID-04374: may this member move it from the entry screen? */
  movable?: boolean;
  /** VTID-04372: a busy block pulled from the member's Google calendar. */
  source?: "google";
  /** VTID-04916: a community event or live room the member can post to the feed. */
  shareable?: boolean;
  /** VTID-04916: the member's feed post about this event, once shared. */
  shared_post_id?: string | null;
}

export type WorkKind = "deploy_staging" | "deploy_prod" | "autopilot_review" | "ticket_due" | "erp_approval";

export interface WorkDescriptor {
  kind: WorkKind;
  source_id: string;
  params: Record<string, string>;
}

export function isWorkItem(item: Pick<CalendarWindowItem, "work">): boolean {
  return !!item.work;
}

export interface CalendarWindow {
  items: CalendarWindowItem[];
  timezone: string | null;
}

export class CalendarApiError extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown> = {}) {
    super(message);
    this.name = "CalendarApiError";
  }
}

interface GatewayBody {
  ok?: boolean;
  error?: unknown;
  data?: unknown;
  timezone?: string | null;
}

async function authedFetch(path: string, role: string | null, init: RequestInit = {}): Promise<GatewayBody> {
  // VTID-04532: the in-memory token, not getSession() — that waits on the
  // auth lock behind every other request fired on a screen change.
  const accessToken = await getAccessToken();
  if (!accessToken) throw new CalendarApiError("NO_AUTH_TOKEN", 401);

  const res = await fetch(`${GATEWAY_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(role ? { "X-Vitana-Active-Role": role } : {}),
      ...(init.headers || {}),
    },
  });
  const body: GatewayBody = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    const msg = typeof body?.error === "string" ? body.error : `HTTP ${res.status}`;
    throw new CalendarApiError(msg, res.status, body as Record<string, unknown>);
  }
  return body;
}

export async function fetchCalendarWindow(from: Date, to: Date, role: string | null, opts: { includeWork?: boolean } = {}): Promise<CalendarWindow> {
  const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  // VTID-04680: staff work items are opt-in; the calendar itself never asks.
  if (opts.includeWork) qs.set("include_work", "true");
  const body = await authedFetch(`/api/v1/calendar/events/window?${qs}`, role);
  const items: CalendarWindowItem[] = Array.isArray(body.data) ? (body.data as CalendarWindowItem[]) : [];
  items.sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
  return { items, timezone: body.timezone ?? null };
}

/** VTID-04536: what the calendar's "+" form sends. */
export interface NewCalendarEntry {
  title: string;
  start_time: string;
  end_time: string | null;
  location?: string | null;
  event_type: string;
  /** VTID-04681: a habit the member chose to put in the calendar repeats daily. */
  rrule?: string | null;
  timezone?: string | null;
  emoji?: string | null;
  source_ref_type?: string | null;
  source_ref_id?: string | null;
}

/**
 * Creates an entry through the gateway (POST /api/v1/calendar/events), the
 * same path Vitana uses, so the member's default reminders apply and the
 * entry is written for the active role.
 */
export async function createCalendarEntry(input: NewCalendarEntry, role: string | null): Promise<{ id: string }> {
  const body = await authedFetch("/api/v1/calendar/events", role, {
    method: "POST",
    body: JSON.stringify({ ...input, source_type: "manual", status: "confirmed" }),
  });
  return { id: String((body.data as { id?: string } | undefined)?.id ?? "") };
}

/**
 * VTID-04995: what a time slot collides with. Own entries carry a title; busy
 * blocks from another role or an outside calendar never do.
 */
export interface CalendarConflict {
  kind: "own" | "busy" | "external";
  title: string | null;
  start_time: string;
  end_time: string | null;
}

export async function fetchCalendarConflicts(
  start: Date,
  end: Date | null,
  role: string | null,
  excludeEventId?: string,
): Promise<CalendarConflict[]> {
  const qs = new URLSearchParams({
    start_time: start.toISOString(),
    end_time: (end ?? new Date(start.getTime() + 60 * 60 * 1000)).toISOString(),
  });
  if (excludeEventId) qs.set("exclude_event_id", excludeEventId);
  const body = await authedFetch(`/api/v1/calendar/conflicts?${qs}`, role);
  const list = (body as { conflicts?: unknown }).conflicts;
  return Array.isArray(list) ? (list as CalendarConflict[]) : [];
}

/** VTID-04996: a free stretch that fits the asked duration. */
export interface FreeSlot {
  start: string;
  end: string;
  duration_minutes: number;
  free_until: string;
}

/** Up to `limit` free slots over the member's busy time and waking hours (GET /events/gaps). */
export async function fetchFreeSlots(durationMin: number, role: string | null, limit = 3): Promise<FreeSlot[]> {
  const qs = new URLSearchParams({ duration: String(durationMin), limit: String(limit) });
  const body = await authedFetch(`/api/v1/calendar/events/gaps?${qs}`, role);
  return Array.isArray(body.data) ? (body.data as FreeSlot[]) : [];
}

export type PillarKey = "nutrition" | "hydration" | "exercise" | "sleep" | "mental";

/** VTID-04915: what completing an entry did to the Vitana Index (null when not recomputed). */
export interface IndexDelta {
  delta_total?: number;
  per_pillar_delta?: Partial<Record<PillarKey, number>>;
}

export async function completeCalendarEntry(eventId: string, role: string | null): Promise<{ vitana_index: IndexDelta | null }> {
  const body = await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}/complete`, role, {
    method: "POST",
    body: JSON.stringify({ completion_status: "completed" }),
  });
  const vi = (body as { vitana_index?: IndexDelta | null }).vitana_index;
  return { vitana_index: vi && typeof vi === "object" ? vi : null };
}

/**
 * VTID-04915: the pillar that moved most after completing an entry, for a
 * "+0.4 Mental" line. Null when nothing went up.
 */
export function topPillarGain(delta: IndexDelta | null): { pillar: PillarKey; points: number } | null {
  const per = delta?.per_pillar_delta;
  if (!per) return null;
  let best: { pillar: PillarKey; points: number } | null = null;
  for (const [pillar, points] of Object.entries(per) as Array<[PillarKey, number]>) {
    if (typeof points === "number" && points > 0 && (!best || points > best.points)) best = { pillar, points };
  }
  return best;
}

/** VTID-04915: the fields a member may change on their own entry. */
export interface CalendarEntryPatch {
  title?: string;
  start_time?: string;
  end_time?: string | null;
  location?: string | null;
  description?: string | null;
}

export async function updateCalendarEntry(eventId: string, patch: CalendarEntryPatch, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}`, role, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** VTID-04915: removes an entry (the gateway marks it cancelled). */
export async function cancelCalendarEntry(eventId: string, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}`, role, { method: "DELETE" });
}

// =============================================================================
// VTID-04358 — private calendar subscription link (Apple / Google / Outlook)
//   GET/POST/DELETE /api/v1/calendar/subscription
// The gateway returns the feed as a PATH once, on creation; only a hash of the
// token is stored, so an existing link can be replaced or revoked, not shown.
// =============================================================================

export interface FeedStatus {
  active: boolean;
  created_at: string | null;
  last_used_at: string | null;
}

export async function fetchFeedStatus(): Promise<FeedStatus> {
  const body = await authedFetch("/api/v1/calendar/subscription", null);
  const d = (body.data ?? {}) as Partial<FeedStatus>;
  return { active: !!d.active, created_at: d.created_at ?? null, last_used_at: d.last_used_at ?? null };
}

/** Creates a new link (the old one stops working) and returns its full https URL. */
export async function createFeedLink(): Promise<string> {
  const body = await authedFetch("/api/v1/calendar/subscription", null, { method: "POST" });
  const path = (body.data as { feed_path?: string } | undefined)?.feed_path;
  if (!path) throw new CalendarApiError("NO_FEED_PATH", 500);
  return feedUrlFromPath(path);
}

export async function revokeFeedLink(): Promise<void> {
  await authedFetch("/api/v1/calendar/subscription", null, { method: "DELETE" });
}

export function feedUrlFromPath(path: string, base: string = GATEWAY_BASE): string {
  return `${base}${path}`;
}

/** The same feed as a webcal:// link, which calendar apps open as "subscribe". */
export function webcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:\/\//, "webcal://");
}

// =============================================================================
// VTID-04374 — move one of your own entries
//   POST /api/v1/calendar/events/:id/move { start_time }
// The gateway keeps the entry's length and answers 409 NOT_MOVABLE with a
// reason for entries a source owns (a booking, a lab order, a series …).
// =============================================================================

export type MoveBlockReason = "cancelled" | "completed" | "recurring" | "owned_by_source";

export async function moveCalendarEntry(eventId: string, start: Date, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}/move`, role, {
    method: "POST",
    body: JSON.stringify({ start_time: start.toISOString() }),
  });
}

/** The reason a move was refused, when the gateway gave one. */
export function moveBlockReasonOf(err: unknown): MoveBlockReason | null {
  if (!(err instanceof CalendarApiError) || err.message !== "NOT_MOVABLE") return null;
  const r = err.body.reason;
  return r === "cancelled" || r === "completed" || r === "recurring" || r === "owned_by_source" ? r : null;
}

// =============================================================================
// VTID-04916 — share an entry to the news feed
//   POST /api/v1/calendar/events/:id/share-to-feed { text?, is_public? }
// Only community events and live room sessions; the gateway checks the event
// is still on, and answers 409 ALREADY_SHARED (with post_id) for a second try.
// =============================================================================

export interface ShareToFeedInput {
  text: string;
  is_public: boolean;
}

export async function shareCalendarEntryToFeed(eventId: string, input: ShareToFeedInput, role: string | null): Promise<string> {
  const body = await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}/share-to-feed`, role, {
    method: "POST",
    body: JSON.stringify({ text: input.text, is_public: input.is_public }),
  });
  const postId = (body.data as { post_id?: string } | undefined)?.post_id;
  if (!postId) throw new CalendarApiError("NO_POST_ID", 500);
  return postId;
}

export type ShareFailure = "already_shared" | "not_shareable" | "limit" | "duplicate" | "suspended" | "error";

/** Why a share was refused, and the existing post when it was shared before. */
export function shareFailureOf(err: unknown): { kind: ShareFailure; postId: string | null } {
  if (!(err instanceof CalendarApiError)) return { kind: "error", postId: null };
  const postId = typeof err.body.post_id === "string" ? err.body.post_id : null;
  switch (err.message) {
    case "ALREADY_SHARED":
      return { kind: "already_shared", postId };
    case "NOT_SHAREABLE":
      return { kind: "not_shareable", postId: null };
    case "SHARE_LIMIT":
    case "RATE_LIMITED":
      return { kind: "limit", postId: null };
    case "DUPLICATE_POST":
      return { kind: "duplicate", postId: null };
    case "USER_SUSPENDED":
      return { kind: "suspended", postId: null };
    default:
      return { kind: "error", postId: null };
  }
}

// =============================================================================
// VTID-04372 — Google Calendar two-way sync
//   GET /api/v1/calendar/google, POST /google/enable, POST /google/disable
// =============================================================================

export interface GoogleSyncStatus {
  availability: "ready" | "not_configured";
  enabled: boolean;
  last_push_at: string | null;
  last_error: string | null;
}

export async function fetchGoogleSyncStatus(): Promise<GoogleSyncStatus> {
  const body = await authedFetch("/api/v1/calendar/google", null);
  const d = (body.data ?? {}) as Partial<GoogleSyncStatus>;
  return {
    availability: d.availability === "ready" ? "ready" : "not_configured",
    enabled: !!d.enabled,
    last_push_at: d.last_push_at ?? null,
    last_error: d.last_error ?? null,
  };
}

/** "enabled" when sync is on; "needs_google" when Google must be connected first. */
export async function enableGoogleSync(): Promise<"enabled" | "needs_google"> {
  try {
    await authedFetch("/api/v1/calendar/google/enable", null, { method: "POST" });
    return "enabled";
  } catch (err) {
    if (err instanceof CalendarApiError && err.status === 409 && err.message === "not_connected") return "needs_google";
    throw err;
  }
}

export async function disableGoogleSync(): Promise<void> {
  await authedFetch("/api/v1/calendar/google/disable", null, { method: "POST" });
}
