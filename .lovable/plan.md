
Report: I broke chat by mixing 3 different chat models and only updating part of the flow.

1. What I damaged

- Direct history fallback is incomplete
  - In `src/hooks/useGlobalMessages.ts:591-633`, direct chats try:
    1) gateway `fetchConversation(peerId)`
    2) legacy `global_messages` fallback
  - But direct DMs live in `chat_messages`, not `global_messages`.
  - Result: if gateway fetch fails/returns empty, thread list can still appear from `fetchDirectFromChatMessages(...)`, but opening that thread can show empty/broken history because there is no matching message-level `chat_messages` fallback.

- Group read state was not wired to the real unread source
  - Group unread in `fetchLegacyThreads` is computed from `global_thread_participants.last_read_at` (`src/hooks/useGlobalMessages.ts:280-291`).
  - But opening a group currently calls `markAsRead(threadId)` which always does `markChatRead(threadId)` (`src/hooks/useGlobalMessages.ts:860-889`), a direct-DM gateway path using peer IDs.
  - For groups, that is the wrong backend and wrong identifier. So group unread can stay stuck.

- Notification unread state is completely separate and never cleared on chat open
  - `ConversationView` marks messages read, but nothing marks related `user_notifications` rows read when a conversation is opened (`src/components/messages/ConversationView.tsx:334-356`).
  - `useNotifications` only clears notification unread when the user clicks the bell item or “mark all read” (`src/hooks/useNotifications.ts:106-124`).
  - So reading a chat does not clear the notification badge.

- Group notification routing still uses sender ID instead of thread UUID
  - `resolveNotificationRoute` always routes `new_chat_message` to `sender_id` (`src/lib/notification-types.ts:429-431`).
  - That is wrong for groups after the UUID-based group restoration.
  - I changed groups to use `thread.id = actual thread UUID`, but I did not update notification deep-linking to follow that rule.

- Direct read-receipt helper is using the wrong storage table
  - `ConversationView` calls `markMessagesAsRead(messageIds, messageContext === 'global')`.
  - For global direct DMs, `messageContext === 'global'` sends read updates to `global_messages`, but those DMs are coming from `chat_messages`.
  - So part of the read path is writing to the wrong table.

2. Evidence

- Database state confirms the notification bug:
  - `249` unread `new_chat_message` notifications still exist in `user_notifications`
  - all `249` have `sender_id`
  - `35` already include `thread_id`
- That matches the code bug:
  - notifications carry enough data for proper routing/clearing
  - but current route logic ignores `thread_id`
  - and chat-open flow never marks those notification rows read

3. Root cause

I restored group threads at the hook level, but I did not fully propagate the new identifier/storage rules everywhere else.

Current system has 3 different realities:
- Direct DM: `peer_user_id` + gateway + `chat_messages`
- Group chat: `thread UUID` + `global_messages` + `global_thread_participants`
- Notifications: `user_notifications` with payload fields like `sender_id` and `thread_id`

The broken behavior comes from treating those as if they were interchangeable.

4. How to fix it

- Fix direct history loading
  - In `useGlobalMessages` message query, add a direct-message fallback that reads `chat_messages` for `(sender_id=user AND receiver_id=peer) OR vice versa`.
  - Only use `fetchLegacyMessages(...)` for:
    - real group threads
    - real legacy direct threads that actually have `_legacyThreadId`

- Fix group read behavior
  - In `markAsRead(threadId)`, branch by thread type:
    - direct: keep `markChatRead(peerId)`
    - group: update `global_thread_participants.last_read_at` for the current user and that thread UUID
  - Optionally also mark unread `global_messages.read_at` for read receipts, but `last_read_at` is the key unread source for groups.

- Fix notification clearing on conversation open
  - Add one canonical “mark chat notifications read” path when a thread is opened.
  - Direct chat: mark unread `user_notifications` where `type='new_chat_message'` and `data->>'sender_id' = peerId`
  - Group chat: mark unread `user_notifications` where `type='new_chat_message'` and `data->>'thread_id' = threadId`
  - After that, trigger notification refetch/shared invalidation so the bell badge updates immediately.

- Fix notification routing
  - In `resolveNotificationRoute(...)`, prefer:
    1) `data.thread_id` for group chat notifications
    2) `data.sender_id` for direct chat notifications
  - Do not force every `new_chat_message` route to sender ID.

- Fix the read-receipt helper in `ConversationView`
  - Stop deciding read backend from `messageContext`.
  - Decide from conversation type/storage backend:
    - group/global legacy thread -> `global_messages`
    - direct gateway DM -> gateway/chat_messages path

5. Priority order

1) Fix `useGlobalMessages` direct history fallback
2) Fix group `markAsRead` to write `global_thread_participants.last_read_at`
3) Fix notification route resolution to support `thread_id`
4) Mark `user_notifications` as read when the conversation is opened
5) Clean up `ConversationView` read helper so it stops targeting the wrong table

6. Expected result after fix

- Direct chat history still loads even if the gateway fetch is flaky
- Group chats open using the real thread UUID
- Opening a group actually clears its unread state
- Opening a chat from a notification opens the correct conversation
- Notification unread count drops when the related chat has been read
