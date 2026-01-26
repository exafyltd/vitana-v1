

# Events Prefetch + Stale-While-Revalidate Implementation

## Completed ✅

### 1. Migrated `useCommunityEvents` to React Query
- Converted from `useState` to `useQuery` for cache-first rendering
- Exported `fetchCommunityEventsQueryFn` for shared use in prefetch
- Real-time subscription now updates React Query cache via `setQueryData`
- Exposes `isFetching` for background refresh indicators

### 2. Added Event Prefetching on Login
- `MaxinaPortal.tsx` now prefetches events **before** navigation on mobile
- Prefetch runs in parallel with tenant switch for faster experience
- Uses global `queryClient` from window for cache population

### 3. Updated Prefetch Registry
- Added `['global-community-events']` prefetch for `/comm` and `/discover` routes
- Uses shared `fetchCommunityEventsQueryFn` for exact cache key match

### 4. Cache-First Loading Guards
- Skeleton only shows when `loading && events.length === 0`
- Cached data renders instantly, no skeleton flash
- Empty state only appears when API truly returns zero events

### 5. Persistent Cache
- Added `'global-community-events'` to `PERSIST_KEYS` in `main.tsx`
- Events survive page refresh via localStorage

## Data Flow

```text
OAuth Success → Session Detected
       ↓
prefetchQuery(['global-community-events']) (mobile only)
       ↓ (parallel)
setTenantBySlug('maxina')
       ↓
navigate('/comm/events-meetups?tab=upcoming')
       ↓
EventsAndMeetups mounts → useQuery checks cache → HIT
       ↓
Render events instantly (no skeleton)
       ↓
Background refetch if stale (isFetching=true, data still shown)
```

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/useCommunityEvents.ts` | Full rewrite to React Query |
| `src/pages/portals/MaxinaPortal.tsx` | Prefetch before navigation |
| `src/lib/prefetch-registry.ts` | Added events to /comm prefetch |
| `src/pages/community/EventsAndMeetups.tsx` | Cache-aware loading guards |
| `src/main.tsx` | Events added to PERSIST_KEYS |
