
You’re right to call this out. I audited the current code and here is the full, direct report of what was wrong and what was made worse.

## What was messed up (with evidence)

1) Sidebar unread badge clear was wired to the wrong broadcast channel  
- `useChatUnreadCount.ts` listens on `chat_unread_read_sync` (line ~119).  
- But read events are sent from `useGlobalMessages.ts` on `unread_sync` (line ~875).  
Impact: after reading a direct chat, sidebar badge can stay stuck until polling fallback runs.

2) The “thread list unread fix” was made dependent on an unreliable broadcast send  
- `useGlobalMessages.ts` sends `unread_change` via `supabase.channel('unread_sync').send(...)` (line ~947) without ensuring a subscribed channel.  
- If that send is not joined/subscribed, the optimistic unread override in `Messages.tsx` may never clear.  
Impact: list badge can stay hidden or stale.

3) Realtime reconnect catch-up was not actually implemented in `useGlobalMessages.ts`  
- No subscription status handler (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`) and no reconnect-triggered refetch currently present.  
Impact: if websocket silently drops (common mobile case), new messages can appear minutes later (only after later refetch/poll/focus events).

4) Inaccurate previous claim  
- A reported “10s polling interval in `useGlobalMessages.ts`” to change to 30s does not exist in current file.  
Impact: false confidence; no real fix happened there.

5) Additional structural risk: duplicate realtime listeners  
- `Messages.tsx` and `ConversationView.tsx` both instantiate `useHybridMessages` -> `useGlobalMessages`, so direct-message realtime listeners can be duplicated while a conversation is open.  
Impact: race conditions/inconsistent unread increments and harder-to-debug behavior.

Do I know what the issue is? Yes.

## Why your latest incident happened (message delayed while app open)
Most likely chain:
- mobile websocket silently dropped/throttled,
- no reconnect catch-up handler in `useGlobalMessages`,
- no immediate authoritative refetch path tied to channel recovery,
- UI waited for a later incidental refresh, so message appeared late.

This matches Supabase’s documented silent-disconnection behavior in background/unstable mobile conditions.

## Concrete fix plan (single stabilization pass, not patch-by-patch)

### A) Unread event contract hardening
Files: `useChatUnreadCount.ts`, `useGlobalMessages.ts`, `useUnreadSync.ts`, `Messages.tsx`
- Standardize to one channel: `unread_sync`.
- Move all `thread_read`/`unread_change` sends to a subscribed shared channel helper.
- In `Messages.tsx`, make optimistic `0` never mask a real positive `thread.unread_count` (local safety net, no broadcast dependency).

### B) Realtime reliability hardening
Files: `src/integrations/supabase/client.ts`, `useGlobalMessages.ts`
- Enable `realtime.worker: true` and heartbeat reconnect callback in Supabase client.
- Add realtime subscribe status/system handlers; on reconnect/subscribe, invalidate active thread + threads list.
- Add explicit catch-up invalidate for active thread on reconnect (not only on visibility change).

### C) Single-source realtime ownership
Files: `useHybridMessages.ts`, `useGlobalMessages.ts`, `ConversationView.tsx`, `Messages.tsx`
- Ensure only one hook instance owns direct-chat realtime subscription to remove duplicate listener races.

### D) Verification matrix (must pass before declaring fixed)
1. Read a direct message -> sidebar badge clears within 1s.  
2. Open thread list after reading -> no stale unread badge.  
3. Keep mobile app open, receive message -> appears in-thread in realtime (<2s).  
4. Simulate background/network drop and return -> missed messages backfilled immediately on reconnect.  
5. No duplicate unread increments from a single incoming message.

If you approve, I’ll implement this as one coordinated stabilization change-set and then give a line-by-line change report + runtime validation results.
