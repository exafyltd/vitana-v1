
Root cause analysis:
- The previous fix was applied in the wrong place. `SwipeableMessage` already had `touchAction: 'pan-y'`, so changing/confirming it there does not unblock the real issue.
- The actual blocker is in `src/components/messages/MessageBubble.tsx`:
  - mobile style is currently `touchAction: 'none'` on the bubble itself (the center touch target users drag on).
  - `touchAction: 'none'` disables native vertical panning on that element, so scrolling only works when touching non-bubble areas (edges/gaps), exactly matching your symptom.

Right fix:
1. In `MessageBubble.tsx`, change mobile touch style from:
   - `touchAction: 'none'`
   to:
   - `touchAction: 'pan-y'` (or `pan-y pinch-zoom`).
2. Keep `WebkitTouchCallout: 'none'` and `onContextMenu={e => e.preventDefault()}` so long-press native menus remain suppressed.
3. Do not add new gesture systems, polling, or extra wrappers. The current swipe-to-reply + long-press logic can remain; this is mainly a touch-action conflict fix.

Why this works:
- Vertical drag on message bubbles will use native scroll (WhatsApp/Telegram behavior).
- Horizontal swipe-to-reply still works via `SwipeableMessage` handler.
- Long-press reaction drawer still works because it is timer/jitter-based and does not require `touchAction: 'none'`.

Implementation scope:
- File to update: `src/components/messages/MessageBubble.tsx`
- Minimal code change: one style value in the bubble container (`style={isMobile ? { ... } : undefined}` block).

Validation checklist (mobile):
- Drag vertically on bubble text/media in center: chat scrolls immediately.
- Drag vertically near left/right edges: still scrolls.
- Swipe right on a message: reply gesture still triggers.
- Long-press on a message: reaction drawer still opens.
- No native browser context menu appears on long-press.

If needed after this patch:
- Only if swipe feels too eager, tighten arbitration in `SwipeableMessage` (e.g., require `abs(dx) > abs(dy) + 8` before setting swipe state). This is optional, second-pass tuning.
