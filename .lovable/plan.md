

## Plan: 3 Bug Fixes + Group Chat Restoration in `useGlobalMessages.ts`

### Fix 1 — Remove broken `messageCache` import and calls
- **Line 6**: Delete `import { messageCache } from "./messageCache";`
- **Line 686**: Delete `messageCache.addMessage(threadId, "global", optimistic);`
- **Line 717**: Delete `messageCache.updateMessage(threadId, "global", optimistic.id, realMsg);`

### Fix 2 — Replace broken `useHybridMessages` import with inline interface
- **Line 22**: Replace `import type { MessageKind, SendMessageArgs } from "./useHybridMessages";` with an inline `SendMessageArgs` interface (drop unused `MessageKind`)

### Fix 3 — Add `.limit()` to global_messages query in `fetchLegacyThreads`
- **Line 215**: Add `.limit(threadIds.length * 2)` before `as any` to prevent fetching the entire `global_messages` table

### Group Chat Restoration (steps 1-3)

**Step 1 — Include group threads in `fetchLegacyThreads`**
- Remove the `.filter((t: any) => t.type === "direct")` on line 232
- Split mapping logic: direct threads use peer user ID as `id` (existing behavior); group threads use the actual thread UUID (`t.id`) as `id`
- Group threads get `type: "group"`, `name: t.name`, all participants, and the same last_message/unread logic

**Step 2 — Route group message sends correctly in `sendMessageLegacy`**
- Before sending, check if the thread is a group (look up thread type from cached threads)
- For group threads: insert directly into `global_messages` table (thread_id, sender_id, body, message_type) + update `global_message_threads.updated_at`
- For direct threads: keep existing gateway + chat_messages fallback path unchanged

**Step 3 — Load group messages when thread is opened**
- In the messages query (`queryFn` at line 581), detect group threads (thread type from cached threads or when `activeThreadId` is a real thread UUID rather than a peer ID)
- For group threads: call `fetchLegacyMessages(activeThreadId)` directly (the thread ID IS the legacy thread ID)
- For direct threads: keep existing gateway-first flow

### Technical details

**Thread ID convention**:
- Direct: `thread.id = peer_user_id` (gateway convention, unchanged)
- Group: `thread.id = actual_thread_uuid` (from `global_message_threads.id`)

**Merge logic update** (line 520-526): Group threads from legacy won't collide with gateway threads (different ID spaces), so existing dedup logic works without changes.

**Files changed**: `src/hooks/useGlobalMessages.ts` only. No Vitana link fix (decoupled per instruction).

