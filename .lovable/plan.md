

## Fix: Bell Notifications Not Delivering + Unread Count Always Shows 1

### Two Issues

**Issue 1: Appilix push trigger missing from live database**

The function `notify_appilix_push()` exists but the trigger `trg_appilix_push` was never created (migration likely failed silently on the `CREATE TRIGGER` statement). No trigger = the edge function never gets called = no mobile bell notifications.

**Issue 2: Unread count always 1**

All three unread computation paths in `useGlobalMessages.ts` use a binary check — "is the last message unread? → 1, else 0". They never count actual unread messages. This means:
- Thread badge: always 0 or 1
- Inbox badge (sum of thread badges): capped at number of threads with any unread, not total unread messages
- Side nav badge: same — derives from thread sum

```text
Current logic (3 places):
  unread_count = lastMsg && lastMsg.sender_id !== userId && !lastMsg.read_at ? 1 : 0

Should be:
  unread_count = count of messages after last_read_at from other senders
```

### Fix Plan

**1. Database migration — Create the missing trigger**

```sql
CREATE TRIGGER trg_appilix_push
AFTER INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_appilix_push();
```

This immediately enables the appilix-push edge function to fire on every new notification insert.

**2. `src/hooks/useGlobalMessages.ts` — Fix unread count computation**

**Gateway path (~line 502):** The gateway returns `last_message` with `read_at`. For direct chats, query actual unread count from `chat_messages` table:
- After fetching conversations, batch-query unread counts: `SELECT sender_id, COUNT(*) FROM chat_messages WHERE receiver_id = userId AND read_at IS NULL GROUP BY sender_id`
- Use this map to set accurate `unread_count` per thread

**Legacy path (~line 285):** Same binary logic. Replace with a count query against `global_messages` where `created_at > last_read_at AND sender_id != userId`.

**Direct fallback path (~line 419):** Same fix — query actual count from `chat_messages`.

**3. Realtime increment (~line 1085):** The `+1` increment is already correct since it adds to existing count on each new message.

**4. All badges auto-align** — since inbox badge, side nav badge, and bottom nav badge all derive from `sum(thread.unread_count)` via the `chat-unread-count-update` CustomEvent, fixing the thread-level count fixes everything.

### Files to modify
- Database migration: create `trg_appilix_push` trigger
- `src/hooks/useGlobalMessages.ts`: replace binary unread checks with actual count queries

