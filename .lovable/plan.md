
Goal: fix two broken behaviors in direct/community chat: (1) reply quote not visible for sender/recipient, (2) reactions appear non-functional.

What I found (root causes)
1) Reply metadata is not persisted in the direct chat path:
- `useGlobalMessages.ts` sends direct messages via gateway (`sendChatMessage`) and ignores `_parentMessageId`.
- `chat_messages` has no `parent_message_id` column, so there is nowhere to store reply linkage today.
- Message hydration in `useGlobalMessages.ts` does not enrich with parent IDs for direct messages.

2) Reactions are being written but not readable for many direct messages:
- Recent `message_reactions` rows exist for `chat_messages` IDs that do not exist in `global_messages/messages`.
- Current reaction access logic (`message_reactions` SELECT policy and `get_message_reactions*` function) only allows global/tenant message tables, not `chat_messages`.
- `useMessageReactions.ts` also uses a fragile relational select (`profiles:user_id`) on a table without FK relations.

Implementation plan
1) Add direct-chat reply metadata table (DB migration)
- Create `public.chat_message_replies`:
  - `message_id uuid primary key references public.chat_messages(id) on delete cascade`
  - `parent_message_id uuid not null references public.chat_messages(id) on delete cascade`
  - `created_by uuid not null`
  - `created_at timestamptz default now()`
- Enable RLS and add policies:
  - SELECT allowed when auth user is sender/receiver of `chat_messages.message_id`
  - INSERT allowed only when auth user is sender of `message_id` (and parent exists)
- Add index on `parent_message_id`.

2) Persist reply mapping when sending direct messages
- In `src/hooks/useGlobalMessages.ts` (`sendMessageLegacy`):
  - after `sendChatMessage(...)` returns created message, if `_parentMessageId` exists, insert into `chat_message_replies`.
  - include `parent_message_id` in the returned `realMsg` object for immediate UI consistency.

3) Hydrate parent IDs when loading direct messages
- In `useGlobalMessages` fetch path:
  - after fetching conversation messages, query `chat_message_replies` for returned message IDs and merge `parent_message_id`.
- Also enrich legacy/global fetches with `parent_message_id` where available.
- Extend `GlobalMessage` + mapper typings to include `parent_message_id?: string | null`.

4) Fix reactions for direct chat messages
- DB migration:
  - update `public.get_message_reactions` (and text wrapper) access check to include `chat_messages` ownership (sender/receiver).
  - optionally align `message_reactions` SELECT policy with same chat_messages clause.
- Frontend:
  - refactor `src/hooks/useMessageReactions.ts` to fetch via `rpc('get_message_reactions_text', { message_id_param })` instead of relational `.select(...profiles...)`.
  - keep realtime subscription; on event, re-fetch via RPC.
  - switch optimistic updates to functional `setReactions(prev => ...)` to avoid stale-state bugs.

5) Small UI reliability touch-ups
- In `MessageBubble.tsx`, use unified `parentId = message.parent_message_id || message.reply_to_message_id` for quote click navigation too.
- Keep long-press reaction tray behavior, but ensure it closes on `touchcancel` and after selection.

Technical file scope
- `src/hooks/useGlobalMessages.ts` (reply persistence + hydration)
- `src/hooks/useMessageReactions.ts` (RPC-based reads + robust optimistic state)
- `src/components/messages/MessageBubble.tsx` (parentId fallback consistency)
- New migration SQL:
  - create `chat_message_replies` + RLS policies
  - update reaction access function/policy for `chat_messages`

Validation checklist
1) Sender swipes a direct-chat message to reply -> sent bubble shows quote immediately.
2) Recipient opens same thread -> sees quote on received reply.
3) Long-press any direct-chat message -> reaction picker opens.
4) Add reaction -> count appears for sender and recipient.
5) Existing old reactions on `chat_messages` become visible after policy/function update.
