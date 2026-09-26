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

export async function fetchCalendarWindow(from: Date, to: Date, role: string | null): Promise<CalendarWindow> {
  const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
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

export async function completeCalendarEntry(eventId: string, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}/complete`, role, {
    method: "POST",
    body: JSON.stringify({ completion_status: "completed" }),
  });
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
