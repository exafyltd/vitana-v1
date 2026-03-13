

# Fix: Reply quote visibility + WhatsApp-style long-press reactions

## Two issues

### 1. Reply quote not visible in sent messages
The `ReplyQuote` component expects `parentMessage.sender.display_name` but the messages in the lookup map may have `sender` structured differently (e.g. `sender.full_name` only, or missing entirely for optimistic messages). The optimistic message (lines 503-523) sets its own `sender` but doesn't resolve the parent — so the reply you just sent shows `parent_message_id` correctly, but the `parentMessage` lookup finds the original message which does have sender data.

The actual issue: when the optimistic message is created, it has `parent_message_id` set, but the `messageMap` is built from the current `messages` array. The optimistic message gets added to the paginated list, but `messageMap` is built inside the render function (not memoized with useMemo). It rebuilds each render, so it should include the parent. This should work.

Most likely culprit: the `ReplyQuote` component checks `parentMessage?.sender?.display_name` but the message data from the query has `sender` as a nested join object. Need to also check `parentMessage?.sender?.full_name`. Looking at `ReplyQuote.tsx` — it already handles both (`display_name || full_name`). 

The real issue might be simpler: the optimistic message's `parent_message_id` is passed as `replyingTo?.id`, but `replyingTo` is cleared on line 632 (`setReplyingTo(null)`) — however the optimistic message is already added with the correct `parent_message_id` before that. So the lookup should work.

Let me reconsider — the `messageMap` is built inside an IIFE in JSX (line 1098-1100). It uses the current `messages` array. When the optimistic message is added via `paginatedMessages.addNewMessage()`, the messages array updates, triggering a re-render, and the new `messageMap` includes the parent. This should work.

**The actual problem**: The `messageMap` only contains messages currently loaded in the view. If the parent message was sent much earlier and is outside the paginated window, it won't be in the map. But for a just-replied-to message, it should be visible. Let me look more carefully...

Actually, the simplest explanation: the reply quote IS rendering but shows "Message not found" because `parentMessage` is null for some reason. Or perhaps the issue is that swipe-to-reply sets `replyingTo` and shows the preview above the input, but when the reply is sent, the **sent bubble** doesn't show the quote of the original message inline.

Given the code, `parent_message_id` is set on the optimistic message, and `resolvedParentMessage` is looked up from `messageMap`. This should render the `ReplyQuote` inside the bubble. If it's not showing, it's likely because the messages from the API don't have `parent_message_id` populated (the gateway may not return it, or uses a different field name).

I'll ensure robustness by also checking `reply_to_message_id` as an alternative field name.

### 2. Reactions: Change double-tap to long-press
Current long-press handler (line 198-203) only vibrates but doesn't show the reaction bar. Double-tap shows reactions. User wants WhatsApp behavior: **long-press** shows reaction bar + context menu options.

## Changes

### `src/components/messages/MessageBubble.tsx`
- **Long-press → show reaction bar**: Move the reaction bar trigger from double-tap into the long-press timer (500ms). Remove double-tap detection entirely.
- Long press shows `EmojiReactionBar` positioned above the message, with haptic feedback.

### `src/components/messages/ConversationView.tsx`  
- Add fallback field check: use `message.parent_message_id || message.reply_to_message_id` when resolving parent messages.

### `src/components/messages/ReplyQuote.tsx`
- No changes needed — already handles missing data gracefully.

