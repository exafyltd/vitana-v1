

## Analysis: Why Mobile Footer Badge is ~30s Late

### Root cause

There are **two independent realtime subscriptions** listening for the same `chat_messages` INSERT event, and they behave differently:

| Component | Hook | Channel | Filter type | Updates |
|-----------|------|---------|-------------|---------|
| Conversation view | `useGlobalMessages` | `chat_messages_realtime_*` | **Client-side** (`if (raw.receiver_id !== user.id) return`) | Thread list + messages |
| Footer badge | `useChatUnreadCount` | `chat_unread_badge` | **Server-side** (`filter: receiver_id=eq.${user.id}`) | Badge count |

The architecture memory explicitly documents that **client-side filtering was chosen because server-side `postgres_changes` filters can be unreliable**. That's why `useGlobalMessages` works (5s delay is normal mobile websocket latency). But `useChatUnreadCount` still uses a server-side filter — on mobile, this filter silently fails to deliver, so the badge falls back to the 60-second poll (~30s average wait).

### Why desktop works

Desktop websockets are stable and server-side filters reliably deliver. Both channels fire near-simultaneously.

### Fix (one line, no new systems)

In `useGlobalMessages.ts`, inside the realtime handler that processes incoming messages (line 904-937), after the optimistic thread update, dispatch the existing DOM event:

```typescript
// After updateThreadsOptimistically block (line 936):
window.dispatchEvent(new Event('chat-unread-refresh'));
```

This piggybacks the badge refresh onto the client-side-filtered channel that already works reliably on mobile. When `useGlobalMessages` receives a new message → it tells `useChatUnreadCount` to `refresh()` → badge updates instantly.

### What this does NOT change
- No new channels, polls, or subscriptions
- The existing `chat_unread_badge` realtime channel remains as a secondary path (works on desktop, harmless on mobile)
- No changes to `useChatUnreadCount.ts`

### File changed

| File | Change |
|------|--------|
| `src/hooks/useGlobalMessages.ts` | Add `window.dispatchEvent(new Event('chat-unread-refresh'))` after line 936 inside the realtime INSERT handler |

