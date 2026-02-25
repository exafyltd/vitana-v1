
Goal: explain why host names still fall back to “Community Host” and define a robust fix so host data remains stable across refreshes, edits, and real-time updates.

What is most likely causing it now
1) Host metadata is still being dropped in non-realtime cache writes
- In `src/hooks/useCommunityEvents.ts`, the realtime UPDATE path now preserves:
  - `creator_display_name`
  - `creator_avatar_url`
  - `is_co_creator`
- But `updateEvent()` still does an optimistic cache replace with raw DB row:
  - `event.id === eventId ? data : event`
- That raw `data` does not include enriched creator fields, so UI falls back to “Community Host”.
- This can happen after editing an event, then it “sticks” because future realtime merges preserve the already-empty metadata.

2) Query result can be hydrated from stale cache without host enrichment context
- `global-community-events` is persisted in localStorage globally.
- Query key is not user-scoped (`['global-community-events']`), so data fetched in a weaker context can be reused in a stronger context.
- If cache contains events without creator fields, those values can keep rendering until a full enrichment refetch overwrites them.

3) Silent partial success pattern makes missing host data look “valid”
- `fetchCommunityEventsQueryFn()` runs parallel requests and only throws for the base events query.
- If enrichment requests return empty/unexpected data, the hook still returns success with undefined creator fields, so fallback text appears instead of triggering retry/diagnostics.

Implementation plan

1. Fix optimistic update paths to preserve enrichment
File: `src/hooks/useCommunityEvents.ts`

A) `updateEvent()` cache write
- Replace raw overwrite with merge that keeps existing enriched fields:
  - `creator_display_name`
  - `creator_avatar_url`
  - `is_co_creator`
- Pattern:
  - find existing cached event by id
  - return `{ ...data, creator_display_name: existing?.creator_display_name, ... }`

B) `createEvent()` cache write
- For newly created event, do not leave raw row as final state.
- Keep current optimistic append if needed for snappy UX, but immediately invalidate/refetch the events query after mutation success to enrich creator fields from profile table.
- This mirrors the fix already applied for realtime INSERT.

2. Make event query auth-aware and context-safe
File: `src/hooks/useCommunityEvents.ts`

A) Use auth loading state
- Pull `loading` from `useAuth()` in the hook.
- Set query `enabled: !authLoading` so first fetch doesn’t run during unknown auth state.

B) Scope query key by auth context
- Change key from `['global-community-events']` to something like:
  - `['global-community-events', user?.id ?? 'anonymous']`
- This prevents polluted cross-context cache reuse.
- Update all related `setQueryData` / `invalidateQueries` calls to use the same scoped key pattern.

C) Optional cache migration safeguard
- On first run after deploy, invalidate old unscoped key to flush stale persisted entries:
  - invalidate `['global-community-events']` legacy key once.

3. Strengthen enrichment reliability
File: `src/hooks/useCommunityEvents.ts`

A) Explicitly handle enrichment query failures
- After `Promise.all`, inspect:
  - `coCreatorResult.error`
  - `profilesResult.error`
  - `participantsResult.error`
- Log structured errors.
- For critical enrichment failure (profiles), either:
  - throw (forces retry), or
  - keep events but trigger `invalidateQueries` backoff retry path.
- Recommended: throw for profiles error so host names aren’t silently degraded.

B) Keep fallback behavior in UI unchanged
- UI fallback (“Community Host”) remains as safety net.
- But data pipeline should now consistently provide real names.

4. Verification plan (end-to-end)
- Case 1: Existing event, host visible
  - Open community events list + details drawer, confirm host name/avatar render.
- Case 2: Edit an event
  - Update title/description as host/co-host.
  - Confirm host name does not regress to “Community Host” after save.
- Case 3: Hard refresh + reopen app
  - Confirm persisted cache still resolves to real host names after initial fetch.
- Case 4: Realtime update after reservation changes
  - Join/leave event from another client/user.
  - Confirm participant count updates and host metadata remains intact.
- Case 5: Login transition
  - Start unauthenticated, then sign in.
  - Confirm event list refetches under user-scoped key and host names appear.

Technical notes (for implementation)
- Keep enrichment-preservation architecture consistent in all write paths, not only realtime handlers.
- Ensure query key consistency across:
  - `useQuery`
  - `setQueryData`
  - `invalidateQueries`
  - any prefetch registry entries using `fetchCommunityEventsQueryFn`.
- Avoid introducing DB schema changes; this is a client cache/state-consistency fix.

ASCII flow (after fix)
```text
DB row (raw event)
   -> fetchCommunityEventsQueryFn
      -> enrich with profile + co-creator + participant counts
         -> cache[user-scoped key]
            -> UI (host name/avatar)

Mutation/realtime update
   -> merge raw payload with existing enriched fields
   -> invalidate/refetch for canonical enrichment
   -> UI remains stable (no "Community Host" regression)
```
