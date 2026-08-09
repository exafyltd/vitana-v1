/**
 * localStorage persistence for the react-query cache (extracted from main.tsx
 * under VTID-03503).
 *
 * Behaviour is unchanged from the inline version — same key, same 24h expiry,
 * same 30s interval, same "restore with the ORIGINAL updatedAt" rule — with one
 * addition: `persistQueryCacheNow()`, so code that has just written a *user's
 * own action* into a persisted query can flush it immediately instead of
 * waiting for the next tick of the interval.
 *
 * Why that matters: the interval means a persisted snapshot can be up to 30
 * seconds behind the live cache. For passive data nobody notices. For a like or
 * a comment the user just made, a refresh inside that window restores the
 * snapshot taken BEFORE the action and the interaction looks like it was
 * thrown away (VTID-03503).
 */
import type { QueryClient } from '@tanstack/react-query';

const PERSIST_KEY = 'vitana-query-cache';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PERSIST_INTERVAL_MS = 30_000;

// Private query keys (global-threads, my-journey, autopilot-onboarding) are
// user-scoped — their queryKey embeds the user id — so persisting them to
// localStorage can't leak one account's data into another's session: a
// different user's query (with a different id) simply won't read the stored
// entry. News + live streams are public.
export const PERSIST_KEYS = [
  'profiles', 'tenant', 'user_preferences', 'health-plans', 'life-compass',
  'global-community-events', 'live-streams', 'profile-stats-count',
  'follow-counts', 'follow-status', 'fx-rate',
  // Added (VTID-03255): warm the first authenticated screens across refreshes.
  'global-threads', 'my-journey', 'autopilot-onboarding',
  'longevity-news', 'community-news',
  // The unified "All" feed (feed v2) — the DEFAULT tab of the News screen, and
  // until now the one news query that was NOT persisted, so a hard refresh
  // always dropped the user back to a cold, spinner-first feed even though the
  // legacy news queries beside it restored instantly. User-scoped (the key
  // embeds the viewer id), same as the other private keys above.
  'all-news-feed',
  // chat_groups rows share the inbox list with global-threads; without this
  // they were the only part of the list that reloaded from empty on refresh.
  'chat-groups',
];

interface PersistedEntry {
  data: unknown;
  timestamp: number;
}

function isPersisted(queryKey: readonly unknown[]): boolean {
  const keyStr = String(queryKey[0]);
  return PERSIST_KEYS.some((k) => keyStr.includes(k));
}

/**
 * Restore the persisted cache into `queryClient`. Call once, before render.
 *
 * CRITICAL: restore with the ORIGINAL `updatedAt` timestamp. Without it,
 * setQueryData stamps dataUpdatedAt=now, so a day-old snapshot looks "fresh"
 * for the full staleTime (2m) and refetchOnMount SKIPS the background refetch
 * — the screen is pinned to stale persisted data. This is why a host who just
 * scheduled a Live Room (and thus has a very recent persisted scheduled-list
 * snapshot that predates her own room) never saw it: her list restored as
 * "fresh" and never refetched, while everyone else fetched on mount and saw it.
 * Passing updatedAt makes truly-stale snapshots refetch immediately on mount
 * (proper stale-while-revalidate: render cache instantly, refresh in background).
 */
export function restoreQueryCache(queryClient: QueryClient): void {
  try {
    const cached = localStorage.getItem(PERSIST_KEY);
    if (!cached) return;
    const parsed = JSON.parse(cached) as Record<string, PersistedEntry | null>;
    const now = Date.now();

    Object.entries(parsed).forEach(([key, value]) => {
      if (value && value.data && (now - value.timestamp) < MAX_AGE_MS) {
        queryClient.setQueryData(JSON.parse(key), value.data, { updatedAt: value.timestamp });
      }
    });
  } catch (e) {
    console.debug('[Cache] Failed to restore cache:', e);
  }
}

/** Serialise the persistable slice of `queryClient`'s cache to localStorage. */
export function writeQueryCache(queryClient: QueryClient): void {
  try {
    const cache: Record<string, PersistedEntry> = {};

    queryClient.getQueryCache().getAll().forEach((query) => {
      if (isPersisted(query.queryKey) && query.state.data !== undefined) {
        cache[JSON.stringify(query.queryKey)] = {
          data: query.state.data,
          timestamp: query.state.dataUpdatedAt,
        };
      }
    });

    localStorage.setItem(PERSIST_KEY, JSON.stringify(cache));
  } catch (e) {
    console.debug('[Cache] Failed to persist cache:', e);
  }
}

let activeQueryClient: QueryClient | null = null;

/**
 * Flush the cache to localStorage right now, out of band with the interval.
 *
 * Deliberately synchronous and un-debounced: the callers are discrete user
 * actions (a like, a comment), not a stream, and any delay reintroduces the
 * exact window this exists to close — a refresh landing between the action and
 * the write. No-ops before `startQueryCachePersistence` has run (tests, SSR).
 */
export function persistQueryCacheNow(): void {
  if (!activeQueryClient) return;
  writeQueryCache(activeQueryClient);
}

/** Start the periodic persistence loop and arm `persistQueryCacheNow`. */
export function startQueryCachePersistence(queryClient: QueryClient): void {
  activeQueryClient = queryClient;
  setInterval(() => writeQueryCache(queryClient), PERSIST_INTERVAL_MS);
}
