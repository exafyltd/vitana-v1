

## Prefetch Chat Threads on Auth Success

### Problem
When users first open the app and log in, navigating to Inbox shows skeleton loaders for several seconds while the gateway cold-starts and threads load. The chat data only starts fetching when the user actually lands on the Inbox page.

### Solution
Trigger chat thread prefetching immediately when authentication succeeds (SIGNED_IN event), so by the time the user navigates to Inbox, the data is already cached in React Query.

### Changes

**1. `src/context/AuthProvider.tsx`**
- Import `QueryClient` from the global window ref and `fetchConversations` + `enrichProfiles` from the chat hooks
- In the `onAuthStateChange` listener, when `event === 'SIGNED_IN'`, fire a background prefetch of `["global-threads", userId]` using the same queryFn shape as `useGlobalMessages`
- This runs in parallel with the rest of the app mounting, giving the gateway 3-5 seconds head start

**2. `src/lib/prefetch-registry.ts`**
- Re-enable the `/inbox` prefetch path (currently commented out) with a lightweight version that calls `fetchConversations()` and caches the result under `["global-threads", userId]`
- This ensures sidebar hover and adjacent-pillar prefetch also warm the inbox cache

### Technical Details

The prefetch in AuthProvider will look like:

```typescript
// On SIGNED_IN, fire-and-forget prefetch
if (event === 'SIGNED_IN' && session?.user) {
  const qc = (window as any).queryClient;
  if (qc) {
    qc.prefetchQuery({
      queryKey: ['global-threads', session.user.id],
      queryFn: () => prefetchInboxThreads(session.user.id),
      staleTime: 2 * 60 * 1000,
    }).catch(() => {});
  }
}
```

A new `prefetchInboxThreads(userId)` helper will be added that calls `fetchConversations()` with a timeout, enriches profiles, and returns the same `GlobalMessageThread[]` shape. This avoids duplicating the full queryFn but ensures cache key match.

### Files to modify
- `src/context/AuthProvider.tsx` -- add prefetch on SIGNED_IN
- `src/lib/prefetch-registry.ts` -- re-enable inbox prefetch for adjacent-pillar warming
- `src/hooks/useGlobalMessages.ts` -- extract the thread-fetching logic into a reusable exported function

