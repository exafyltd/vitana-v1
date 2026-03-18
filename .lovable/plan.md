

# Chat History Disappearing + "26 Years" Timestamp

## Two Issues

### Issue 1: "26 years" Timestamp
The auto-seeded Vitana thread (lines 551-573 in `useGlobalMessages.ts`) hardcodes `updated_at: "2000-01-01T00:00:00.000Z"` to sort it to the bottom. The `MobileConversationCard` passes `thread.updated_at` as the timestamp and uses `formatDistanceToNow()`, which correctly computes ~26 years from Jan 2000.

**Fix**: In `MobileConversationCard`, the timestamp formatting doesn't handle "years" — it only replaces hours/minutes/days. Additionally, the Vitana seed thread should use `last_message.created_at` (which is `new Date().toISOString()`) as its display timestamp, or the card should prefer `last_message.created_at` over `updated_at` for display.

Two changes:
1. **`Messages.tsx` line 914**: Pass `thread.last_message?.created_at || thread.updated_at` as timestamp instead of just `thread.updated_at`
2. **`MobileConversationCard.tsx` lines 43-52**: Add `.replace(' years', 'y').replace(' year', 'y')` and handle edge cases like "less than a minute" → "now"

### Issue 2: Chat History Disappearing
The inbox only shows the Vitana seed thread — all real conversations are gone. This means all three data sources returned empty:
- Gateway `/conversations` — timed out or returned empty
- `chat_messages` direct fallback — returned no rows
- Legacy `global_message_threads` — returned no rows

The most likely cause: the gateway is cold-starting or failing, AND the Supabase `chat_messages` query returns nothing because messages for this user don't exist in that table (they may be in `global_messages` or the gateway's own store only).

**Fix**: The fallback chain at line 533-537 only queries `chat_messages` when `conversations.length === 0`. But it doesn't also try legacy threads in that case — it does (line 467-470 fetches legacy in parallel). So if legacy returns empty too, we're left with just the Vitana seed.

The real fix: ensure the `fetchDirectFromChatMessages` fallback also covers `global_messages` (not just `chat_messages`), since some direct conversations may only exist there. Also, add console logging when all sources return empty so we can diagnose.

### Changes

| File | Change |
|------|--------|
| `src/pages/Messages.tsx` | Line 914: use `thread.last_message?.created_at \|\| thread.updated_at` as timestamp |
| `src/components/messages/mobile/MobileConversationCard.tsx` | Add year handling + "just now" fallback to timestamp formatter |
| `src/hooks/useGlobalMessages.ts` | Expand fallback to also query `global_messages` for direct threads; add diagnostic logging when all sources return empty |

