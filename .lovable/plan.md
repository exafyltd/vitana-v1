

## Fix: Unify Inbox Badges With Thread Data (Current Tab Only)

### Root Cause

Three independent unread count sources produce three different numbers:

```text
Source                          Value   Used by
─────────────────────────────── ─────── ──────────────────────
/chat/unread-count (gateway)    0       useChatUnreadCount (intended)
Thread-level unread_count sum   2       Thread list in Messages.tsx
/notifications/unread-count     3       useNotifications (bell icon)

Badge on bottom nav/drawer      3       Stale optimistic value
```

`useChatUnreadCount` uses gateway `/chat/unread-count` (returns 0), but its realtime handlers optimistically increment on each `user_notifications` INSERT. When the gateway confirm fetch inside the `catch` block fails, the optimistic value sticks. Three notification INSERTs (including `message_reaction` types that shouldn't count) accumulated to 3.

Meanwhile, the thread list computes unread from `last_message.read_at`, giving 2 for one thread. The badge and thread list never converge because they use completely different data sources.

### Fix: Derive badge count from thread cache

Replace the gateway-based unread count with a computation from the same thread data the inbox displays. This guarantees badge = sum of thread badges.

**1. `src/hooks/useGlobalMessages.ts`** -- Dispatch computed count

Change the `chat-unread-refresh` dispatch to a `CustomEvent` carrying the computed total unread from threads:

```typescript
// In the threads persistence useEffect (~line 586-591)
useEffect(() => {
  if (user && threads.length > 0 && !isThreadsLoading) {
    debouncedPersistThreads(user.id, threads);
    const totalUnread = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0);
    window.dispatchEvent(new CustomEvent('chat-unread-count-update', { detail: { count: totalUnread } }));
  }
}, [user, threads, isThreadsLoading]);
```

Also update the markAsRead dispatch (~line 984) to use the same event.

**2. `src/hooks/useTenantMessages.ts`** -- Same dispatch for tenant context

Add a similar useEffect that dispatches `chat-unread-count-update` when tenant threads load, so switching to Network tab updates the badge.

**3. `src/hooks/useChatUnreadCount.ts`** -- Listen for computed count

Replace the `chat-unread-refresh` → gateway fetch pattern with a `chat-unread-count-update` CustomEvent listener that sets the count directly from the thread sum:

```typescript
function handleCountUpdate(e: Event) {
  const count = (e as CustomEvent).detail?.count ?? 0;
  setCount(count);
}
window.addEventListener('chat-unread-count-update', handleCountUpdate);
```

Remove the `user_notifications` realtime subscription (it was incorrectly counting `message_reaction` notifications as chat unreads). Keep the `chat_messages` INSERT subscription but change it to just trigger a thread refetch rather than incrementing optimistically.

Remove the `/chat/unread-count` gateway polling entirely -- the badge now derives from thread data.

**4. `src/hooks/useGlobalMessages.ts`** -- Fix realtime handler badge sync (~line 1068)

Change the `chat-unread-refresh` dispatch in the realtime INSERT handler to compute from the updated cache and dispatch `chat-unread-count-update`.

### Why this fixes the sync

- Badge = `sum(thread.unread_count)` from the same React Query cache the thread list renders
- Side drawer and bottom nav both read from the same `useChatUnreadCount` singleton
- "Current tab only" is automatic: whichever context's `useGlobalMessages` or `useTenantMessages` is active dispatches the event
- No more optimistic increments from notification types that shouldn't count (reactions, etc.)
- No more stale optimistic values from failed gateway confirms

### Files to modify
- `src/hooks/useChatUnreadCount.ts` -- listen for CustomEvent, remove gateway polling/notification subscription
- `src/hooks/useGlobalMessages.ts` -- dispatch computed count via CustomEvent
- `src/hooks/useTenantMessages.ts` -- add same dispatch for tenant threads

