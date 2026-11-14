/**
 * VTID-05530 (native-wave2-events-calendar-r3/calendar-reminders) — native twin of the web's
 * calendar gateway client (`src/lib/calendar-window-client.ts`): the window read, create, complete,
 * move, edit, remove, conflicts and free slots. The same paths, bodies and answers, sent through the
 * app's gateway fetch (`src/auth/gateway`, which adds the bearer token) with the active role in
 * `X-Vitana-Active-Role`. Sharing to the feed, invites, the calendar subscription link and the
 * Google sync are not part of this port (listed in the PR body).
 */
import { getGateway } from '../../../auth/gateway';

export type ReminderRule = { kind: 'before'; minutes: number } | { kind: 'evening_before'; hour: number };

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

export type WorkKind = 'deploy_staging' | 'deploy_prod' | 'autopilot_review' | 'ticket_due' | 'erp_approval';

export interface WorkDescriptor {
  kind: WorkKind;
  source_id: string;
  params: Record<string, string>;
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
  work?: WorkDescriptor;
  /** May this member move it from the entry screen? */
  movable?: boolean;
  /** A busy block pulled from the member's Google calendar. */
  source?: 'google';
  shareable?: boolean;
  invitable?: boolean;
  sensitive?: boolean;
  shared_post_id?: string | null;
}

export interface CalendarWindow {
  items: CalendarWindowItem[];
  timezone: string | null;
}

export class CalendarApiError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;
  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CalendarApiError';
    this.status = status;
    this.body = body;
  }
}

interface GatewayBody {
  ok?: boolean;
  error?: unknown;
  data?: unknown;
  timezone?: string | null;
  [key: string]: unknown;
}

async function authedFetch(path: string, role: string | null, init: RequestInit = {}): Promise<GatewayBody> {
  const res = await getGateway()(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(role ? { 'X-Vitana-Active-Role': role } : {}),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });
  const text = await res.text();
  let body: GatewayBody = {};
  if (text) {
    try {
      body = JSON.parse(text) as GatewayBody;
    } catch {
      body = {};
    }
  }
  if (!res.ok || body?.ok === false) {
    const msg = typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`;
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

/** What the "+" form sends. */
export interface NewCalendarEntry {
  title: string;
  start_time: string;
  end_time: string | null;
  location?: string | null;
  event_type: string;
}

/** Creates an entry through the gateway, the same path Vitana uses, so the default reminders apply. */
export async function createCalendarEntry(input: NewCalendarEntry, role: string | null): Promise<{ id: string }> {
  const body = await authedFetch('/api/v1/calendar/events', role, {
    method: 'POST',
    body: JSON.stringify({ ...input, source_type: 'manual', status: 'confirmed' }),
  });
  return { id: String((body.data as { id?: string } | undefined)?.id ?? '') };
}

/** What a time slot collides with. Own entries carry a title; busy blocks never do. */
export interface CalendarConflict {
  kind: 'own' | 'busy' | 'external';
  title: string | null;
  start_time: string;
  end_time: string | null;
}

export async function fetchCalendarConflicts(start: Date, end: Date | null, role: string | null, excludeEventId?: string): Promise<CalendarConflict[]> {
  const qs = new URLSearchParams({
    start_time: start.toISOString(),
    end_time: (end ?? new Date(start.getTime() + 60 * 60 * 1000)).toISOString(),
  });
  if (excludeEventId) qs.set('exclude_event_id', excludeEventId);
  const body = await authedFetch(`/api/v1/calendar/conflicts?${qs}`, role);
  const list = body.conflicts;
  return Array.isArray(list) ? (list as CalendarConflict[]) : [];
}

/** A free stretch that fits the asked duration. */
export interface FreeSlot {
  start: string;
  end: string;
  duration_minutes: number;
  free_until: string;
}

export async function fetchFreeSlots(durationMin: number, role: string | null, limit = 3): Promise<FreeSlot[]> {
  const qs = new URLSearchParams({ duration: String(durationMin), limit: String(limit) });
  const body = await authedFetch(`/api/v1/calendar/events/gaps?${qs}`, role);
  return Array.isArray(body.data) ? (body.data as FreeSlot[]) : [];
}

export type PillarKey = 'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental';

/** What completing an entry did to the Vitana Index (null when not recomputed). */
export interface IndexDelta {
  delta_total?: number;
  per_pillar_delta?: Partial<Record<PillarKey, number>>;
}

export async function completeCalendarEntry(eventId: string, role: string | null): Promise<{ vitana_index: IndexDelta | null }> {
  const body = await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}/complete`, role, {
    method: 'POST',
    body: JSON.stringify({ completion_status: 'completed' }),
  });
  const vi = body.vitana_index as IndexDelta | null | undefined;
  return { vitana_index: vi && typeof vi === 'object' ? vi : null };
}

/** The pillar that moved most after completing an entry, for a "+0.4 Mental" line. Null when nothing went up. */
export function topPillarGain(delta: IndexDelta | null): { pillar: PillarKey; points: number } | null {
  const per = delta?.per_pillar_delta;
  if (!per) return null;
  let best: { pillar: PillarKey; points: number } | null = null;
  for (const [pillar, points] of Object.entries(per) as Array<[PillarKey, number]>) {
    if (typeof points === 'number' && points > 0 && (!best || points > best.points)) best = { pillar, points };
  }
  return best;
}

/** The fields a member may change on their own entry. */
export interface CalendarEntryPatch {
  title?: string;
  start_time?: string;
  end_time?: string | null;
  location?: string | null;
  description?: string | null;
}

export async function updateCalendarEntry(eventId: string, patch: CalendarEntryPatch, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}`, role, { method: 'PATCH', body: JSON.stringify(patch) });
}

/** Removes an entry (the gateway marks it cancelled). */
export async function cancelCalendarEntry(eventId: string, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}`, role, { method: 'DELETE' });
}

export type MoveBlockReason = 'cancelled' | 'completed' | 'recurring' | 'owned_by_source';

export async function moveCalendarEntry(eventId: string, start: Date, role: string | null): Promise<void> {
  await authedFetch(`/api/v1/calendar/events/${encodeURIComponent(eventId)}/move`, role, {
    method: 'POST',
    body: JSON.stringify({ start_time: start.toISOString() }),
  });
}

/** The reason a move was refused, when the gateway gave one. */
export function moveBlockReasonOf(err: unknown): MoveBlockReason | null {
  if (!(err instanceof CalendarApiError) || err.message !== 'NOT_MOVABLE') return null;
  const r = err.body.reason;
  return r === 'cancelled' || r === 'completed' || r === 'recurring' || r === 'owned_by_source' ? r : null;
}

export type ShareFailure = 'already_shared' | 'not_shareable' | 'limit' | 'duplicate' | 'suspended' | 'error';

/** Why a share was refused (the share panel itself is not part of this port; the rule stays with the client). */
export function shareFailureOf(err: unknown): { kind: ShareFailure; postId: string | null } {
  if (!(err instanceof CalendarApiError)) return { kind: 'error', postId: null };
  const postId = typeof err.body.post_id === 'string' ? err.body.post_id : null;
  switch (err.message) {
    case 'ALREADY_SHARED':
      return { kind: 'already_shared', postId };
    case 'NOT_SHAREABLE':
      return { kind: 'not_shareable', postId: null };
    case 'SHARE_LIMIT':
    case 'RATE_LIMITED':
      return { kind: 'limit', postId: null };
    case 'DUPLICATE_POST':
      return { kind: 'duplicate', postId: null };
    case 'USER_SUSPENDED':
      return { kind: 'suspended', postId: null };
    default:
      return { kind: 'error', postId: null };
  }
}
