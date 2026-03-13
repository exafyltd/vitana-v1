
Issue summary:
- On Android webview, long-press gives vibration (so the long-press timer fires), but no reaction drawer becomes visible.
- This now fails on all messages.
- The “framed text” is likely the message bubble receiving focus styles (`focus:ring-*`) on touch.

Do I know what the issue is?
- Yes.

Root cause:
- In mobile inbox conversation mode, the chat container is rendered as `fixed inset-0 z-[55]` (`src/pages/Messages.tsx`).
- The shared Vaul drawer wrapper currently renders overlay/content at `z-50` (`src/components/ui/drawer.tsx`).
- So the reaction drawer can open but remain visually behind the conversation layer, making it appear as “nothing happened.”
- The visible “framed” state is consistent with the bubble’s touch focus ring, not with a visible drawer.

Implementation plan:

1) Make reaction drawer stack above mobile conversation layer
- File: `src/components/ui/drawer.tsx`
- Add an optional prop to `DrawerContent` such as `overlayClassName`.
- Apply it to `<DrawerOverlay className={overlayClassName} />` so callers can raise overlay/content z-index per drawer instance.

2) Raise only the message reaction drawer z-index
- File: `src/components/messages/MessageBubble.tsx`
- Update the reaction drawer usage:
  - Keep current long-press logic.
  - Set `DrawerContent` class to a higher z-index (e.g. `!z-[120] pb-safe`).
  - Pass `overlayClassName` with a matching high z-index (e.g. `!z-[119]`).
- This avoids changing z-index behavior for all other drawers in the app.

3) Remove misleading touch focus frame on message bubble
- File: `src/components/messages/MessageBubble.tsx`
- Change focus styles from `focus:*` to `focus-visible:*` on the bubble container.
- Keyboard accessibility remains intact; touch long-press no longer looks like a “selected frame” state.

Why this approach:
- Fixes the actual visibility/layering bug without risking mobile navigation stacking.
- Keeps drawer behavior scoped to reactions instead of globally altering every drawer in the app.
- Preserves the already-correct long-press gesture logic you recently added.

Validation checklist:
- Android webview: long-press plain text message → vibration → reaction drawer visibly appears above chat.
- Overlay visibly dims chat and tapping outside closes drawer.
- Emoji tap adds reaction to the pressed message.
- Swipe-to-reply still works.
- No “framed/selected” look on touch unless using keyboard focus.
