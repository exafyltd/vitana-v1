

## Fix: Inbox Empty + Badge Out of Sync

### Root Cause

The `staleTime: 0` fix on the **prefetch** was necessary but insufficient. The real blocker is the **consumer**: `useGlobalMessages` declares `staleTime: 10 minutes` on the threads query. When React Query evaluates staleness for a `useQuery` observer, it uses the **observer's own staleTime**, not the prefetch's. Since the prefetch just populated the cache (seconds ago), `Date.now() - dataUpdatedAt < 10 min` is true, so React Query treats the data as fresh and **never calls the full queryFn**.

The prefetch only fetches gateway direct chats (no groups, no legacy threads, no Vitana bot). If the gateway is cold or returns empty, the cache holds `[]` — and the full queryFn never runs to correct it.

### Fix (2 changes)

**1. `src/hooks/useGlobalMessages.ts`** — Set threads query `staleTime: 0`

Change the threads query staleTime from 10 minutes to 0. This ensures the full queryFn always runs when the component mounts, even if prefetched data exists. The user still sees instant content via `placeholderData` (localStorage cache), so there's no visual penalty.

```typescript
// Line ~578-580
enabled: !!user && isGlobalContext,
staleTime: 0,        // was STALE_TIME (10min) — prefetch data must not block full fetch
gcTime: GC_TIME,
```

Keep the messages query `staleTime` at 10 minutes (individual thread messages don't have a prefetch collision).

**2. `src/hooks/useGlobalMessages.ts`** — Make unread_count on threads consistent with badge

Currently, the gateway thread mapper only sets `unread_count: 1` or `0` based on the last message's `read_at`. The `useChatUnreadCount` singleton uses the gateway's `/unread-count` endpoint which returns the true total (7). To keep the inbox thread-level counts consistent, after building the merged thread list, sum unread counts and dispatch a `chat-unread-refresh` event so the badge re-syncs.

This is a minor addition — just dispatch the event after threads are fetched so all badge sources converge.

### Files to modify
- `src/hooks/useGlobalMessages.ts` — threads query staleTime → 0, add badge sync event

### Why this works
- `placeholderData` from localStorage provides instant UI (no flash)
- `staleTime: 0` forces the full queryFn to run immediately after mount
- Full queryFn fetches gateway + legacy + groups + Vitana = complete thread list
- Realtime handlers find all threads and update correctly
- Badge stays in sync because both the thread list and the singleton use the same gateway source

