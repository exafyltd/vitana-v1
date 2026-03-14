

# Fix: Event Card CTA Button Loading on Every Navigation

## Problem
Every time you navigate away from the Events & Meet-Ups screen and come back, every event card remounts and the "Buy Ticket" / "Join" button shows a loading spinner. This is because `useEventParticipation` uses raw `useState` with `checking: true` as initial state and fires a fresh Supabase query on every mount — there is no caching.

## Root Cause
In `src/hooks/useEventParticipation.ts`:
- `checking` starts as `true` (line 29)
- A `useEffect` fires a Supabase query per card on every mount (lines 37-68)
- No caching layer — results are discarded on unmount

In `src/components/crossover/NewsCard.tsx` (line 267):
```
const isLoading = eventId ? (eventParticipation?.loading || eventParticipation?.checking) : ...
```
So `checking = true` → spinner on every remount.

## Fix
Replace the raw `useState`/`useEffect` participation check with a **React Query** query that caches the result. This aligns with the project's existing caching architecture (staleTime 2m, gcTime 10m).

### Changes to `src/hooks/useEventParticipation.ts`:
1. Replace the `checking` state and its `useEffect` with a `useQuery` call:
   - Query key: `['event-participation', eventId, userId]`
   - Returns `{ isParticipating: boolean }`
   - `staleTime: 2 * 60 * 1000` (2 min — matches project defaults)
   - `enabled: !!eventId && isValidUUID(eventId) && !!user?.id && !!session`
2. Derive `checking` from `isLoading` of the query (will be `false` when cached data exists)
3. On toggle participation, invalidate the query + optimistic update
4. Keep the realtime subscription for live updates — it can call `queryClient.setQueryData` instead of `setState`

### Result
- First visit: normal load (spinner shows briefly)
- Navigate away and back: cached → no spinner, instant render
- After 2 minutes: silent background refetch
- Realtime updates still work via subscription pushing into query cache

