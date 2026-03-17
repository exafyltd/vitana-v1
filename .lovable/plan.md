

## Fix: Group Messages Always Showing as Unread

### Root Cause

Two related bugs in `src/hooks/useGlobalMessages.ts`:

**Bug 1 — Unread count ignores sender identity (line 284-291)**

The unread calculation compares `lastMsg.created_at > myParticipation.last_read_at` but never checks whether the current user IS the sender. So if you send a message to a group, your own message is newer than your `last_read_at`, and it counts as "unread" for you.

**Bug 2 — Sending a group message never updates `last_read_at` (line 728-746)**

After inserting into `global_messages`, the code updates `global_message_threads.updated_at` but does NOT update `global_thread_participants.last_read_at` for the sender. So every new message the user sends pushes the thread into "unread" state for themselves.

### Fix

#### Change 1: `useGlobalMessages.ts` — Fix unread count calculation (~line 284)

Add a sender check: if the last message was sent by the current user, unread is always 0.

```typescript
const unreadCount =
  lastMsg && lastMsg.sender_id === userId
    ? 0  // Own messages are never unread
    : lastMsg && myParticipation?.last_read_at
      ? new Date(lastMsg.created_at) > new Date(myParticipation.last_read_at)
        ? 1
        : 0
      : lastMsg
        ? 1
        : 0;
```

#### Change 2: `useGlobalMessages.ts` — Update `last_read_at` after sending a group message (~line 746)

After the group message insert succeeds, also update the sender's `last_read_at`:

```typescript
// After updating thread's updated_at (line 746):
await supabase
  .from("global_thread_participants")
  .update({ last_read_at: new Date().toISOString() })
  .eq("thread_id", threadId)
  .eq("user_id", user.id);
```

This ensures the sender's participation timestamp stays current, so even if the unread calculation runs before the fix in Change 1 takes effect (e.g. from a cache or another code path), it still resolves correctly.

### Files Modified
- `src/hooks/useGlobalMessages.ts` — two targeted edits

