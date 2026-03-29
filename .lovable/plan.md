

# Fix ORB: hide in direct chat + adjust mobile vertical position

## Issue 1: Hide ORB on direct chat screen
The mobile ConversationView renders as a full-screen overlay at `z-[55]` in `src/pages/Messages.tsx` (line 944). The ORB sits at `z-index: 60`, so it floats on top of the chat.

**Fix**: Set a body data attribute when the conversation is open on mobile, then hide the ORB via CSS.

- **`src/pages/Messages.tsx`**: Add `useEffect` in the mobile branch that sets `document.body.dataset.chatScreenOpen = "true"` when `selectedThreadId` is truthy and removes it on cleanup/deselect.
- **`src/index.css`**: Add a suppression rule (same pattern as consent dialog) for `body[data-chat-screen-open="true"]` that sets `opacity: 0; pointer-events: none; z-index: 0` on all ORB selectors. Place inside the existing mobile media query block.

## Issue 2: ORB positioned too high on mobile
Current bottom calc: `calc(var(--appilix-bottom-nav-height, 72px) + env(safe-area-inset-bottom, 0px) - 36px)`.

The 36px offset assumes the ORB is 72px in diameter. The external widget ORB appears to be ~56px, so the current formula pushes it too far above the footer. Need to reduce the offset so the ORB sits with exactly 50% overlap on the footer bar.

**Fix**: Change offset from `36px` to `28px` in `src/index.css` line 615:
```css
bottom: calc(var(--appilix-bottom-nav-height, 72px) + env(safe-area-inset-bottom, 0px) - 28px) !important;
```
This pulls the ORB ~8px lower, centering it on the footer's top edge.

## Files to edit
1. `src/index.css` — add chat-screen ORB suppression rule + adjust bottom offset
2. `src/pages/Messages.tsx` — set/clear `data-chat-screen-open` body attribute

