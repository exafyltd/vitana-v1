
# Fix: Group chats disappear after navigating away and returning

## Root Cause

`prefetchInboxThreads()` (called on every `SIGNED_IN` and `TOKEN_REFRESHED` event, plus route prefetch) **only calls the gateway API** (`fetchConversations()`), which returns **only direct DMs**. Group threads live in the legacy tables (`global_message_threads` / `global_thread_participants`) and are fetched by `fetchLegacyThreads()` inside `useGlobalMessages`'s queryFn -- but NOT by the prefetch.

The race condition:
1. User loads app -> auth fires -> `prefetchInboxThreads` caches DM-only data under `["global-threads", userId]`
2. Messages page mounts -> `useGlobalMessages` queryFn runs (both gateway + legacy) -> groups appear briefly
3. User leaves, returns -> auth fires `TOKEN_REFRESHED` -> prefetch **overwrites** cache with DM-only data again
4. `useGlobalMessages` has `staleTime: 10 minutes` -> serves stale DM-only cache without refetching -> **groups gone**

The prefetch uses `staleTime: 0` which means it always re-runs and overwrites. But `useGlobalMessages` uses `staleTime: 10 min` which means it trusts the prefetch cache and doesn't re-run its full queryFn.

## Fix

**File: `src/lib/prefetchInboxThreads.ts`** -- Add legacy thread fetching to include group threads in the prefetch result.

### Changes:
1. Import the same `supabase` client queries used by `fetchLegacyThreads` in `useGlobalMessages.ts`
2. Add a `fetchLegacyGroupThreads(userId)` call inside `prefetchInboxThreads` that queries `global_thread_participants` + `global_message_threads` for `type = 'group'` threads
3. Merge legacy group threads into the prefetch result (same dedup-by-id logic as `useGlobalMessages`)
4. This ensures the cache always contains both DMs and groups, regardless of which queryFn fills it

### Implementation detail:
- Extract the group thread query into a lightweight helper (subset of `fetchLegacyThreads` filtering for `type = 'group'` only)
- Keep a 5-second timeout on the group query to not block the prefetch
- Merge into the conversations array before returning

**No other files need to change.** The `useGlobalMessages` queryFn already merges correctly -- the problem is purely that the prefetch was incomplete.

## Why this is the right fix
- Fixes both mobile and desktop (same code path)
- Doesn't change staleTime or caching strategy
- Prefetch result becomes a superset, so the full queryFn can only add more data, never lose it
- Minimal change surface: one file, additive logic only
