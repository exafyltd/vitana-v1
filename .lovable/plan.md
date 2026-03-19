

## Fix: Synchronize Global Unread Badge with Thread-Level Counts

### Problem
When a new message arrives, the per-thread unread count updates **instantly** (optimistic `+1` in the React Query cache), but the global badge in the bottom nav and sidebar updates with a **delay** because it waits for its own Supabase realtime channel to fire, then makes a round-trip to the gateway API (`/chat/unread-count`).

### Root Cause
Two independent update paths with different latencies:
- **Thread list** (useGlobalMessages): Receives realtime event → optimistically increments `unread_count + 1` in cache → instant UI update
- **Global badge** (useChatUnreadCount): Receives its own realtime event → calls `fetchUnreadCount()` gateway API → waits for response → updates

The thread-level handler in `useGlobalMessages` never notifies the global badge store.

### Solution
Two complementary changes:

**1. `src/hooks/useGlobalMessages.ts`** — After optimistically incrementing thread `unread_count`, dispatch `chat-unread-refresh` so the global badge starts updating immediately:
- Add `window.dispatchEvent(new Event('chat-unread-refresh'))` right after the thread cache update (around line 1036), so the badge fetch fires in parallel with the thread UI update.

**2. `src/hooks/useChatUnreadCount.ts`** — Optimistically increment the count immediately on realtime INSERT, then confirm with the gateway:
- In the `chat_messages` INSERT handler (line 96): call `setCount(currentCount + 1)` **before** the `fetchUnreadCount()` call, so the badge updates instantly. The gateway response will correct any drift.
- Same pattern for the `user_notifications` INSERT handler (line 108).

### Result
All three badge locations (thread card, bottom nav, sidebar drawer) will update simultaneously when a new message arrives — the global badge will optimistically increment in the same tick as the thread count, with the gateway fetch confirming the exact value moments later.

