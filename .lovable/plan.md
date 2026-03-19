

## Fix: Real-time Messages Not Appearing + Prefetch Cache Collision

### Root Cause

The recent prefetch change introduced a cache collision. `prefetchInboxThreads()` populates `['global-threads', userId]` with **only gateway direct chats** (no group threads, no legacy threads, no Vitana). It's cached with `staleTime: 10 minutes`.

When `useGlobalMessages` mounts, React Query sees fresh cached data under the same key and **skips calling its own full queryFn** (which fetches gateway + legacy + group + Vitana). The hook's realtime subscription then tries to update a thread list that may be incomplete or structurally incompatible, causing silent failures.

Additionally, if the prefetch runs before the auth token is fully ready, it caches an **empty array** as fresh data, making the inbox appear empty for up to 10 minutes.

### Fix (2 changes, minimal risk)

**1. `src/context/AuthProvider.tsx`** -- Change prefetchQuery staleTime to 0

Set `staleTime: 0` in the `prefetchQuery` call. This means:
- The prefetched data immediately appears in the UI (React Query uses it as initial/placeholder data)
- The hook's full queryFn runs immediately after to fetch the complete thread list (gateway + legacy + groups)
- No 10-minute stale window where incomplete data blocks the real fetch

```typescript
qc.prefetchQuery({
  queryKey: ['global-threads', userId],
  queryFn: () => prefetchInboxThreads(userId),
  staleTime: 0, // ← was 10 * 60 * 1000 — let the hook's full queryFn always run
}).catch(() => {});
```

**2. `src/lib/prefetch-registry.ts`** -- Same staleTime fix if prefetch is called there

Ensure any prefetch registry entry for inbox also uses `staleTime: 0`.

### Why this fixes real-time

The realtime subscription itself was never broken — the Supabase channel on `chat_messages` still fires. But the realtime handler updates the `['global-threads', userId]` cache (line 1043). When that cache contains stale/incomplete prefetched data, the handler's thread lookup can fail silently (the thread isn't found, so the update is skipped). With `staleTime: 0`, the full thread list loads within seconds of login, and the realtime handler finds the correct thread to update.

### Files to modify
- `src/context/AuthProvider.tsx` — change staleTime from 10min to 0
- `src/lib/prefetch-registry.ts` — same fix

