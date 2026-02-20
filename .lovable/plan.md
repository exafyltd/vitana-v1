
## Add Android Hardware Back Button Support to Shorts Feed

### What Needs to Change

The Shorts feed (`MobileShortsFeed`) currently only supports closing via the on-screen arrow button (`onBack`). The Android hardware back button does nothing while inside the Shorts feed because the feed renders as a fixed overlay (not a new route), so React Router has no history entry to pop.

The fix is to intercept the browser's `popstate` event (which fires when the Android back button is pressed in a WebView) inside `MobileShortsFeed`, and call `onClose()` when it fires.

### How Android Back Works in WebViews

Android's hardware back button fires `window.history.go(-1)` in WebViews, which triggers the browser's `popstate` event. The standard pattern to intercept it is:
1. On mount: push a dummy history entry (`window.history.pushState(null, '', window.location.href)`) so there is something to pop
2. Listen for `popstate` — when it fires, call `onClose()` instead of navigating away
3. On unmount: clean up the listener (and optionally pop the dummy entry with `window.history.back()`, though the browser handles this automatically)

### Plan

**Single file to edit:** `src/components/community/MobileShortsFeed.tsx`

**Change — Add a `useEffect` that pushes a history entry and listens for `popstate`:**

```typescript
// Android hardware back button support
useEffect(() => {
  // Push a dummy history entry so the back button has something to pop
  window.history.pushState(null, '', window.location.href);

  const handlePopState = () => {
    onClose();
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}, [onClose]);
```

This effect:
- Runs once on mount (when the Shorts feed opens)
- Pushes a dummy entry into browser history so the back button pops it instead of navigating away from the page
- When `popstate` fires (back button pressed), calls `onClose()` which already handles closing the overlay
- Cleans up on unmount so no stale listeners remain

### Why This Works

- The `MobileShortsFeed` is a `fixed inset-0` overlay, not a route change — so React Router doesn't manage its lifecycle
- `window.history.pushState` + `popstate` listener is the standard WebView pattern for intercepting the Android back button (used by YouTube Shorts, Instagram Reels, TikTok)
- The `onClose` prop already has all the cleanup logic (pausing videos, restoring state) — we just need to call it from the hardware back button path too

### Files to Edit
- `src/components/community/MobileShortsFeed.tsx` — add one `useEffect` (8 lines)
