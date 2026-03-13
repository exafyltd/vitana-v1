
Issue restated:
- On Android webview, long-press on a plain text message gives haptic feedback, but the reaction panel never appears.
- Swipe-to-reply works, so touch events are partially working.

Do I know what the issue is?
- Yes: the current mobile long-press flow in `MessageBubble.tsx` only opens the drawer on `touchend`.
- On Android webviews, long-press often ends with `touchcancel` (not `touchend`), and current `handleTouchCancel` clears pending state, so the drawer never opens.

What to change (implementation plan):

1) Harden long-press finalization in `src/components/messages/MessageBubble.tsx`
- Create a single `finalizeLongPressGesture()` helper used by both `handleTouchEnd` and `handleTouchCancel`.
- If long-press was already confirmed (`pendingDrawerOpen.current === true`), open drawer from either terminal event.
- Add one-shot guard so it can’t open twice if both events fire.

2) Prevent false cancellation after long-press is already confirmed
- In `handleTouchMove`, only cancel gesture before long-press confirmation.
- Once haptic has fired and pending open is set, ignore post-confirmation jitter (common on Android release motion).

3) Block native long-press context interference on the bubble
- Add `onContextMenu={(e) => e.preventDefault()}` on the message bubble touch target.
- This reduces Android webview long-press takeover behavior that can trigger cancellation paths.

4) Webview safety tweak for this reaction drawer instance
- In this same `MessageBubble.tsx` drawer usage, pass webview-safe props to Vaul root (e.g. `repositionInputs={false}` and, if needed, `modal={false}` as fallback).
- Keep this scoped to the message reaction drawer only (not global drawer behavior).

Files affected:
- `src/components/messages/MessageBubble.tsx` (primary, likely sufficient)
- No backend/database changes.

Validation checklist:
- Android webview: long-press plain text message → haptic → reaction drawer appears consistently.
- Slight finger drift after haptic still opens drawer.
- Intentional swipe-right still triggers reply.
- Selecting emoji from drawer adds reaction to that specific message.
- Regression check: desktop context menu behavior unchanged.
