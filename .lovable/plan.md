
Goal: fix two real issues in Inbox messaging:
1. Delete still does nothing for direct chats
2. Edit mode is unreadable on mobile because the textarea blends into the bubble

What I found:
- The current delete/edit handlers in `ConversationView.tsx` write to:
  - `global_messages` when `messageContext === 'global'`
  - `messages` when `messageContext === 'tenant'`
- That is only correct for:
  - group/community threads → `global_messages`
  - tenant threads → `messages`
- But direct Inbox/community conversations are actually loaded from the gateway / `chat_messages` fallback, not `global_messages`.
- So for direct chats, the UI is editing/deleting the wrong table. That explains why Delete appears broken.
- I also checked database policies:
  - `messages` has a DELETE policy for sender-owned messages
  - `global_messages` currently shows no DELETE policy
  - `chat_messages` currently has no DELETE policy, and only limited UPDATE rules
- So even after routing correctly, direct-message delete may still need a backend/RLS adjustment if you want true deletion.

Planned fix:
1. Route message actions to the correct storage source
- In `ConversationView.tsx`, determine the thread kind before edit/delete:
  - if tenant thread → use `messages`
  - if community group thread → use `global_messages`
  - if community direct chat → use `chat_messages` or gateway API
- Reuse the already available thread metadata (`currentThread.type === 'group'`) instead of guessing from `messageContext`.

2. Make delete actually work for direct Inbox chats
- Update delete logic so direct chats target `chat_messages` instead of `global_messages`.
- If frontend delete is blocked by current RLS, add the smallest necessary backend support:
  - either a proper DELETE policy for sender-owned `chat_messages`
  - or a gateway delete endpoint if hard-delete is intended to go through the gateway
- Also return a visible success/failure toast so the user immediately sees what happened.

3. Make edit save to the correct source
- Route edits exactly the same way:
  - tenant → `messages.body`
  - community group → `global_messages.body`
  - community direct → `chat_messages.content`
- Keep the current inline edit UX, but persist to the correct column/table.

4. Fix the unreadable edit UI
- In `MessageBubble.tsx`, the edit textarea is rendered inside an own-message bubble with inherited light text styling.
- I would restyle only the edit state so it is clearly visible:
  - explicit dark text color on the textarea
  - clearer white/neutral surface
  - stronger border/ring
  - slightly separated action row
- This keeps the current interaction, but makes the editing area readable on mobile.

5. Keep everything else unchanged
- No rewrite of messaging architecture
- No removal of existing gestures/drawers/context menus
- No change to reply/reaction behavior
- Only targeted fixes for routing, permissions, and edit-state styling

Files to update:
- `src/components/messages/ConversationView.tsx`
  - route edit/delete by actual thread type and backing store
  - improve error/success feedback
- `src/components/messages/MessageBubble.tsx`
  - improve edit textarea contrast and edit-state styling
- Possibly backend/RLS support for `chat_messages`
  - only if direct-message delete/update is blocked by current policies

Technical note:
- There is a likely backend gap today:
  - `chat_messages` has no visible DELETE policy
  - `chat_messages` UPDATE is currently scoped to receiver read-status, not sender content edits
- So for direct-chat edit/delete, code-only frontend fixes may not be enough by themselves.
- If you approve implementation, I would first wire the frontend to the correct source, then add the minimal backend permission support needed for sender-owned direct messages.

Expected result after implementation:
- Delete works in Inbox for the sender’s own direct messages
- Edit saves to the correct record source
- The edit box is readable and usable on mobile
- Group chats and tenant chats keep working as before
