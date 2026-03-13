

# Fix: Drawer opens and immediately dismisses on mobile long-press

## Root cause

The long-press timer fires at 500ms **while the user's finger is still on the screen**. This calls `setShowDoubleTapReactions(true)`, which opens the vaul Drawer. When the user then lifts their finger, vaul's internal gesture handler captures that `touchend` event on the newly-rendered overlay and interprets it as a "swipe down to dismiss" — closing the Drawer instantly. The Drawer appears and vanishes in a single frame, making it invisible.

## Fix

**`src/components/messages/MessageBubble.tsx`** — Instead of opening the Drawer immediately in the timer callback, set a flag (`pendingDrawerOpen`) and defer the actual `setShowDoubleTapReactions(true)` call to `handleTouchEnd`. This ensures the Drawer only opens **after** the user lifts their finger, so vaul's gesture system doesn't capture the release as a dismiss.

```text
Current flow:
  touchstart → [500ms] → open Drawer (finger still down) → touchend → vaul dismisses

Fixed flow:
  touchstart → [500ms] → vibrate + set flag → touchend → open Drawer (finger already up)
```

### Changes in `MessageBubble.tsx`:
1. Add a `pendingDrawerOpen` ref (boolean flag)
2. In the 500ms timer callback: set `isLongPress.current = true`, vibrate, set `pendingDrawerOpen.current = true` — but do NOT call `setShowDoubleTapReactions(true)` yet
3. In `handleTouchEnd`: check `pendingDrawerOpen.current` — if true, call `setShowDoubleTapReactions(true)` and reset the flag
4. In `handleTouchCancel`: reset `pendingDrawerOpen.current = false`

This is a single-file, ~10-line change. No other files affected.

