

# Fix: Enable message replies and reactions (WhatsApp-style)

## Problem

The reply and reaction UI components all exist but two critical wiring gaps prevent them from working:

1. **Reply quotes never appear on received messages** -- `ConversationView` passes `onReply` to `MessageBubble` (so the context menu "Reply" option works and sets `replyingTo` state), but it never passes the `parentMessage` prop or `onScrollToMessage`. So when a message has `parent_message_id`, the `ReplyQuote` inside the bubble has no data to render.

2. **No mobile-friendly way to reply or react** -- The only trigger is right-click (context menu), which is not discoverable on mobile. WhatsApp uses swipe-right-to-reply and double-tap to react.

## Plan

### 1. Wire up parent message resolution in ConversationView

In the message rendering loop (lines ~1097-1165), resolve and pass `parentMessage` for each message:

- Build a `Map<id, message>` from the current `messages` array (memoized).
- For each `MessageBubble`, if `message.parent_message_id` exists, look it up in the map and pass it as `parentMessage`.
- Pass a `onScrollToMessage` callback that finds the DOM element by message ID and scrolls to it with a highlight flash.

### 2. Add swipe-to-reply gesture on mobile

Create a lightweight `SwipeableMessage` wrapper component:
- Wraps each `MessageBubble` in the message list.
- On horizontal swipe-right (threshold ~60px), triggers `onReply(message)`.
- Shows a reply icon that slides in during the swipe (like WhatsApp).
- Uses touch events (`touchstart`/`touchmove`/`touchend`) -- no extra library needed.
- Only active on mobile (`useIsMobile`).

### 3. Add double-tap to react on mobile

In `MessageBubble`:
- Track taps; on double-tap within 300ms, show the `EmojiReactionBar` positioned near the message.
- Single tap remains no-op (or scroll-to-parent if it's a reply quote).

### Files to change

| File | Change |
|------|--------|
| `src/components/messages/ConversationView.tsx` | Build message lookup map; pass `parentMessage` and `onScrollToMessage` to each `MessageBubble` |
| `src/components/messages/SwipeableMessage.tsx` | **New** -- swipe-right wrapper with reply icon animation |
| `src/components/messages/MessageBubble.tsx` | Add double-tap detection to show `EmojiReactionBar` on mobile; integrate with existing `handleReactionSelect` |
| `src/components/messages/ConversationView.tsx` | Wrap `MessageBubble` in `SwipeableMessage` for mobile |

### Technical notes

- **Scroll-to-parent**: Use `document.getElementById(`msg-${id}`)` pattern; add `id` attribute to each message wrapper div in the rendering loop. Scroll with `scrollIntoView({ behavior: 'smooth', block: 'center' })` and briefly highlight with a CSS animation class.
- **Swipe gesture**: Pure touch events with `translateX` transform. Cancel if vertical movement exceeds horizontal (user is scrolling). Reset on touch end if below threshold.
- **Message map**: `useMemo(() => new Map(messages.map(m => [m.id, m])), [messages])` -- O(1) lookups, rebuilt only when messages change.
- **Double-tap**: Use a ref to track last tap time; if delta < 300ms, fire reaction bar. This avoids conflicting with the existing long-press handler.

