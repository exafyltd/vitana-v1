

# Fix: Long-press reactions not triggering on mobile

## Root cause

The `SwipeableMessage` wrapper has its own `onTouchStart/Move/End` handlers on a parent `<div>` that wraps the `MessageBubble`. On mobile, even the slightest finger movement (which is normal during a long press) causes `SwipeableMessage.handleTouchMove` to fire. Once `dx > 10`, it sets `swiping.current = true` and starts translating the element — this DOM movement then causes `MessageBubble.handleTouchMove` to detect drift and **clear the longPressTimer**, preventing the drawer from ever opening.

Additionally, on iOS Safari, the browser may fire native `touchcancel` events during a long press (for text selection or link preview), which also clears the timer.

## Fix

### `src/components/messages/SwipeableMessage.tsx`
- Add a **hold-off period** before swipe detection begins. During the first ~400ms after `touchstart`, ignore horizontal movement (so the long-press timer can fire without interference). Only start swipe tracking after the hold-off or if movement is clearly intentional (e.g., `dx > 20` early).
- Expose a way to disable swiping when the reaction drawer is open (accept a `disabled` prop or similar).

### `src/components/messages/MessageBubble.tsx`
- Add `touch-action: none` CSS on the message bubble div to prevent the browser from intercepting the long press for native gestures (text selection, context menu).
- Add `-webkit-touch-callout: none` and `user-select: none` styles to prevent iOS Safari from triggering its own long-press behaviors that fire `touchcancel`.
- Increase the touch-move threshold from `10px` to `15px` to be more forgiving of natural finger jitter during a hold.

### `src/components/messages/ConversationView.tsx`
- No changes needed — `SwipeableMessage` fix is self-contained.

## Summary of changes

| File | What |
|------|------|
| `SwipeableMessage.tsx` | Delay swipe detection by ~400ms after touch start so long-press can fire first |
| `MessageBubble.tsx` | Add CSS `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` on bubble; widen jitter threshold to 15px |

