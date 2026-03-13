

# Fix: Long-press reactions not working on mobile

## Root cause

**Radix `ContextMenu` steals the long-press gesture on mobile.** The message bubble is wrapped in `<MessageContextMenu>` which uses Radix's `<ContextMenu>`. On touch devices, Radix `ContextMenu` intercepts the long-press to open its own right-click menu -- this prevents the custom `handleTouchStart` 500ms timer from ever showing the `EmojiReactionBar`.

Additionally, even if the reaction bar did appear, `EmojiReactionBar` uses `onMouseLeave={onClose}` which is unreliable on touch (no hover concept).

## Fix

### 1. Disable Radix ContextMenu on mobile (`MessageContextMenu.tsx`)
On mobile, render children directly without the `ContextMenu` wrapper. The long-press handler in `MessageBubble` will handle everything instead.

### 2. Replace floating `EmojiReactionBar` with bottom sheet on mobile (`MessageBubble.tsx`)
Instead of rendering a `position: fixed` bar (which has positioning and hover-dismiss issues on mobile), show the reaction bar + action buttons inside a bottom sheet (`ResponsivePopover` or a `Drawer`). This matches WhatsApp's actual behavior where long-press opens a bottom tray.

- Use a `Dialog`/sheet that renders the emoji row at top + action items (Reply, Copy, Forward, Delete) below.
- Close on emoji selection or action tap.
- Remove `onMouseLeave` dismiss -- use backdrop tap instead.

### 3. Prevent SwipeableMessage from cancelling long-press
Add `touchMove` cancellation of the long-press timer in `MessageBubble.tsx` -- if user moves finger, cancel the timer (this already exists via `handleTouchCancel`, but `touchMove` on the `SwipeableMessage` wrapper may not trigger `touchCancel`). Add explicit `handleTouchMove` to clear the timer if movement exceeds a small threshold.

## Files to change

| File | Change |
|------|--------|
| `src/components/messages/MessageContextMenu.tsx` | On mobile, skip the `ContextMenu` wrapper and render children directly |
| `src/components/messages/MessageBubble.tsx` | Replace floating `EmojiReactionBar` with a bottom sheet on mobile; add `onTouchMove` to cancel long-press on finger movement |
| `src/components/messages/EmojiReactionBar.tsx` | Remove `onMouseLeave={onClose}`; add optional `onActionSelect` props for Reply/Copy/etc. so the mobile sheet can show actions too |

