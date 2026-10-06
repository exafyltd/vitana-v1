/**
 * VTID-04903 — what the Events screen's default "Hot" tab shows.
 *
 * Hot used to be ONLY the events of one hardcoded account plus one hardcoded
 * event id, so every other member's event was invisible on the default tab
 * and Hot went empty whenever that account had nothing upcoming (owner report
 * 2026-10-05: "Mariia posted the new event, but in my event catalog nothing
 * visible"). Curated events still lead; every other upcoming event follows.
 */
export const CURATED_CREATOR_ID = '07ade9bf-9c2f-4fe1-a733-29e85a1d253b';
export const CURATED_EVENT_IDS: ReadonlySet<string> = new Set([
  '6bb46db6-a3ba-42b6-8a50-2be8658e436f', // Dancing Filmevent
]);

/** A member event posted this recently ranks right after the curated ones. */
const FRESH_MS = 72 * 60 * 60 * 1000;

export interface HotEventInput {
  id: string;
  created_by: string;
  created_at?: string | null;
  start_time: string;
  end_time?: string | null;
  participant_count?: number | null;
  /** Live Room items (VTID-04907) carry `is_live` / `is_due` here. */
  metadata?: { is_live?: boolean; is_due?: boolean } | null;
}

const t = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

export function isCuratedEvent(e: HotEventInput): boolean {
  return e.created_by === CURATED_CREATOR_ID || CURATED_EVENT_IDS.has(e.id);
}

/**
 * Upcoming (not yet ended) events, ordered:
 *   0. Live Rooms that are live right now, most viewers first (VTID-04907);
 *   1. curated events, soonest first;
 *   2. member events created in the last 72h, newest first;
 *   3. every other event, most participants first, then soonest.
 * Hot is a highlight list, so an event drops out the moment it ends.
 */
export function selectHotEvents<T extends HotEventInput>(events: T[], now: Date = new Date()): T[] {
  const nowMs = now.getTime();
  // A live (or due, waiting for its host) room stays listed past its planned end.
  const ongoing = (e: T) => e.metadata?.is_live === true || e.metadata?.is_due === true;
  const live = events.filter((e) => ongoing(e) || t(e.end_time || e.start_time) > nowMs);

  const liveNow: T[] = [];
  const curated: T[] = [];
  const fresh: T[] = [];
  const rest: T[] = [];
  for (const e of live) {
    if (e.metadata?.is_live === true) liveNow.push(e);
    else if (isCuratedEvent(e)) curated.push(e);
    else if (e.created_at && nowMs - t(e.created_at) <= FRESH_MS) fresh.push(e);
    else rest.push(e);
  }

  liveNow.sort((a, b) => (b.participant_count ?? 0) - (a.participant_count ?? 0));
  curated.sort((a, b) => t(a.start_time) - t(b.start_time));
  fresh.sort((a, b) => t(b.created_at) - t(a.created_at));
  rest.sort(
    (a, b) =>
      (b.participant_count ?? 0) - (a.participant_count ?? 0) ||
      t(a.start_time) - t(b.start_time),
  );
  return [...liveNow, ...curated, ...fresh, ...rest];
}
