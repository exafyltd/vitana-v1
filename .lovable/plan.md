

## Fix: Desktop Emoji Reactions Not Working in Context Menu

### Problem
On desktop, clicking emoji reaction buttons in the right-click context menu does nothing. This is because the quick reaction buttons are plain `<button>` elements inside Radix UI's `ContextMenuContent`. Radix intercepts pointer events for non-`ContextMenuItem` children, so `onClick` handlers on plain buttons are swallowed.

### Solution
Wrap each quick reaction emoji in a `ContextMenuItem` component instead of a plain `<button>`. Use `onSelect` (Radix's callback) instead of `onClick` to ensure the handler fires and the menu closes properly.

### File to modify
**`src/components/messages/MessageContextMenu.tsx`**

- Replace the `<button>` elements for each emoji in `QUICK_REACTIONS` with `<ContextMenuItem>` using `onSelect={() => onEmojiSelect(emoji)}`
- For the "More emojis" `EmojiPicker` trigger, keep it as-is but ensure the `onEmojiSelect` callback works by wrapping interaction properly
- The emoji picker (`<Plus>` button) may also need adjustment — wrapping it in a way that Radix doesn't swallow the open event

### Technical detail
```tsx
// Before (broken):
<button onClick={() => onEmojiSelect(emoji)}>
  {emoji}
</button>

// After (working):
<ContextMenuItem onSelect={() => onEmojiSelect(emoji)}>
  {emoji}
</ContextMenuItem>
```

