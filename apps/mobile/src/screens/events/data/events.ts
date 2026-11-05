/**
 * VTID-05531 (native-wave2-events-calendar-r3/events-meetups) — the events and
 * meetups reads and writes, native twins of `src/hooks/useCommunityEvents.ts`
 * (list read, enrichment, deep-link read, create / update / delete),
 * `src/hooks/useFollowingFeed.ts` and the `resolve_event_by_slug` RPC that
 * `src/pages/PublicEventLanding.tsx` calls. Same tables, filters and columns.
 * The member id comes from the native auth context. The web hooks import the
 * Supabase client (class-B), so they are re-implemented here, not core-extracted.
 */
import { getSupabase } from '../../../auth/client';
import { isHttpUrl, toVirtualLink } from '../../../ports/events';

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = () => getSupabase() as any;

/** How far back "recently created" reaches for the second read (web VTID-04903). */
export const RECENT_CREATED_DAYS = 14;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 86_400_000;

export interface CommunityEvent {
  id: string;
  slug?: string | null;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  virtual_link: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  metadata?: Record<string, any> | null;
  is_co_creator: boolean;
  creator_display_name?: string;
  creator_avatar_url?: string;
}

type EventRow = Omit<CommunityEvent, 'participant_count' | 'is_co_creator' | 'creator_display_name' | 'creator_avatar_url'>;

export interface FollowedProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FollowingFeed {
  followingIds: string[];
  profiles: FollowedProfile[];
}

/** What the create and edit writes send to `global_community_events`. */
export interface EventInput {
  title: string;
  description: string | null;
  event_type: 'event' | 'meetup';
  location: string | null;
  virtual_link: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
}

/** The form state of the create and edit sheets (local date and time strings). */
export interface EventForm {
  kind: 'event' | 'meetup';
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Whole days from the start date to the end date (1 when the event ends after midnight). Absent means 0. */
  endDayOffset?: number;
  location: string;
  isVirtual: boolean;
  virtualLink: string;
  capacity: string;
}

export type EventFormField = 'title' | 'date' | 'startTime' | 'endTime' | 'location';

/** Attendee count per event, one row per attending participant (web VTID-04594: counted, not aggregated). */
export async function fetchParticipantCounts(eventIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (eventIds.length === 0) return counts;
  const { data, error } = await db().from('global_event_participants').select('event_id').in('event_id', eventIds).eq('status', 'attending');
  if (error) return counts;
  for (const row of data ?? []) counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  return counts;
}

/** Co-creator flag, creator profile and attendee count for raw event rows. */
export async function enrichCommunityEvents(rows: EventRow[], userId: string | null): Promise<CommunityEvent[]> {
  const creators = [...new Set(rows.map((e) => e.created_by))];
  const [coCreator, profiles, counts] = await Promise.all([
    userId ? db().from('event_co_creators').select('event_id').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
    db().from('global_community_profiles').select('user_id, display_name, avatar_url').in('user_id', creators),
    fetchParticipantCounts(rows.map((e) => e.id)),
  ]);
  if (profiles.error) throw profiles.error;
  const coCreatorIds = new Set((coCreator.data ?? []).map((c: any) => c.event_id));
  const byUser = new Map<string, any>((profiles.data ?? []).map((p: any) => [p.user_id, p]));
  return rows.map((event) => {
    const creator = byUser.get(event.created_by);
    return {
      ...event,
      participant_count: counts.get(event.id) ?? 0,
      is_co_creator: coCreatorIds.has(event.id),
      creator_display_name: creator?.display_name || undefined,
      creator_avatar_url: creator?.avatar_url || undefined,
    };
  });
}

/** The hub's list: the nearest upcoming events plus recently created upcoming ones, merged and sorted by start. */
export async function fetchCommunityEvents(userId: string | null, now = new Date()): Promise<CommunityEvent[]> {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const recentSince = new Date(now.getTime() - RECENT_CREATED_DAYS * DAY_MS);
  const [nearest, recent] = await Promise.all([
    db().from('global_community_events').select('*').gte('start_time', today.toISOString()).order('start_time', { ascending: true }).limit(100),
    db()
      .from('global_community_events')
      .select('*')
      .gte('start_time', today.toISOString())
      .gte('created_at', recentSince.toISOString())
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (nearest.error) throw nearest.error;
  const byId = new Map<string, EventRow>();
  for (const row of [...(nearest.data ?? []), ...(recent.data ?? [])] as EventRow[]) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  const rows = [...byId.values()].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  return enrichCommunityEvents(rows, userId);
}

/** Who the viewer follows, with their profiles (the Following tab). */
export async function fetchFollowingFeed(viewerId: string | undefined): Promise<FollowingFeed> {
  if (!viewerId) return { followingIds: [], profiles: [] };
  const { data: rows, error } = await db().from('user_follows').select('following_id').eq('follower_id', viewerId);
  if (error) throw error;
  const followingIds = (rows ?? []).map((r: any) => r.following_id as string);
  if (followingIds.length === 0) return { followingIds, profiles: [] };
  const { data: profiles, error: profileError } = await db().from('global_community_profiles').select('user_id, display_name, avatar_url').in('user_id', followingIds);
  if (profileError) throw profileError;
  return { followingIds, profiles: (profiles ?? []) as FollowedProfile[] };
}

/** One event by id (UUID) or share slug, for a deep link to an event outside the loaded list. */
export async function fetchEventByIdOrSlug(ref: string, userId: string | null = null): Promise<CommunityEvent | null> {
  const value = ref.trim();
  if (!value) return null;
  const base = db().from('global_community_events').select('*');
  const { data, error } = await (UUID_RE.test(value) ? base.eq('id', value) : base.eq('slug', value)).maybeSingle();
  if (error || !data) return null;
  const [event] = await enrichCommunityEvents([data as EventRow], userId);
  return event ?? null;
}

/** One row of the `resolve_event_by_slug` RPC (supabase/migrations/20251218141717_62e91ac0-9b81-4944-b430-254bc2db1e53.sql). */
export interface PublicEventRow {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  start_time: string;
  end_time: string | null;
  max_participants: number | null;
  participant_count: number;
  image_url: string | null;
  slug: string | null;
  organizer_name: string;
  organizer_avatar: string | null;
  metadata: Record<string, any> | null;
  has_tickets: boolean;
  lowest_ticket_price: number | null;
  is_paid_event: boolean;
  is_sold_out: boolean;
}

/** The public landing's resolver: a slug or an id, through the same RPC the web calls. */
export async function resolvePublicEvent(identifier: string): Promise<PublicEventRow | null> {
  const { data, error } = await db().rpc('resolve_event_by_slug', { identifier });
  if (error) throw error;
  const rows = (data ?? []) as PublicEventRow[];
  return rows[0] ?? null;
}

export async function createCommunityEvent(userId: string, input: EventInput): Promise<CommunityEvent> {
  const { data, error } = await db().from('global_community_events').insert({ ...input, metadata: {}, created_by: userId }).select().single();
  if (error) throw error;
  return data as CommunityEvent;
}

export async function updateCommunityEvent(id: string, input: EventInput): Promise<CommunityEvent> {
  const { data, error } = await db().from('global_community_events').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as CommunityEvent;
}

export async function deleteCommunityEvent(id: string): Promise<void> {
  const { error } = await db().from('global_community_events').delete().eq('id', id);
  if (error) throw error;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function validTime(value: string): boolean {
  const m = TIME_RE.exec(value.trim());
  return !!m && Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

/** A local Date from the form's date (YYYY-MM-DD) and time (HH:MM) strings, `dayOffset` days after that date. */
export function localDateTime(date: string, time: string, dayOffset = 0): Date {
  const [y, mo, d] = date.trim().split('-').map(Number);
  const [h, mi] = time.trim().split(':').map(Number);
  return new Date(y, mo - 1, d + dayOffset, h, mi, 0, 0);
}

/** Whole local calendar days from the start's date to the end's date: 0 for a same-day event, 1 when it ends after midnight. */
export function calendarDaysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const startDay = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
  const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
  return Math.round((endDay - startDay) / DAY_MS);
}

/** The first field that blocks submit, or null. Order matches the form. */
export function validateEventForm(form: EventForm, now: Date): EventFormField | null {
  if (!form.title.trim()) return 'title';
  const dm = DATE_RE.exec(form.date.trim());
  if (!dm || !isRealDate(Number(dm[1]), Number(dm[2]), Number(dm[3]))) return 'date';
  if (!validTime(form.startTime)) return 'startTime';
  const start = localDateTime(form.date, form.startTime);
  if (start.getTime() < now.getTime()) return 'startTime';
  if (form.endTime.trim()) {
    if (!validTime(form.endTime) || localDateTime(form.date, form.endTime, form.endDayOffset) <= start) return 'endTime';
  }
  if (!form.isVirtual && !form.location.trim()) return 'location';
  return null;
}

/** The write payload for a valid form. Online meetups keep only an http(s) link; in-person ones keep the location. */
export function buildEventInput(form: EventForm): EventInput {
  const link = form.virtualLink.trim();
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    event_type: form.kind,
    location: form.isVirtual ? null : form.location.trim() || null,
    virtual_link: form.isVirtual && isHttpUrl(link) ? toVirtualLink(true, link) ?? null : null,
    start_time: localDateTime(form.date, form.startTime).toISOString(),
    end_time: form.endTime.trim() ? localDateTime(form.date, form.endTime, form.endDayOffset).toISOString() : null,
    max_participants: form.capacity.trim() ? Number.parseInt(form.capacity, 10) : null,
  };
}

/** Owners and co-creators may edit an event that has not started yet. */
export function canEditEvent(event: Pick<CommunityEvent, 'created_by' | 'start_time'>, userId: string | null, isCoCreator: boolean, now: Date): boolean {
  if (!userId) return false;
  const owner = event.created_by === userId || isCoCreator;
  return owner && new Date(event.start_time).getTime() > now.getTime();
}

/** Only the creator deletes (web EventKebabMenu: creator only). */
export function canDeleteEvent(event: Pick<CommunityEvent, 'created_by'>, userId: string | null): boolean {
  return !!userId && event.created_by === userId;
}
