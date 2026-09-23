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

import { supabase } from "@/integrations/supabase/client";

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
  constructor(message: string, public status: number) {
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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new CalendarApiError("NO_AUTH_TOKEN", 401);

  const res = await fetch(`${GATEWAY_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(role ? { "X-Vitana-Active-Role": role } : {}),
      ...(init.headers || {}),
    },
  });
  const body: GatewayBody = await res.json().catch(() => ({}));
  if (!res.ok || body?.ok === false) {
    const msg = typeof body?.error === "string" ? body.error : `HTTP ${res.status}`;
    throw new CalendarApiError(msg, res.status);
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

export async function completeCalendarEntry(eventId: string, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}/complete`, role, {
    method: "POST",
    body: JSON.stringify({ completion_status: "completed" }),
  });
}
