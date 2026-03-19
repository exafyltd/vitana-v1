

## Fix: Emoji Picker Not Working on Mobile

### Problem
The `EmojiPicker` component in `MessageInput.tsx` uses a Radix `Popover` with `side="top"` and a fixed `w-80` (320px) width. On mobile, tapping the smiley icon either:
- Opens the popover off-screen or clipped (the 320px popover may overflow the viewport)
- Gets blocked by z-index conflicts with the chat view's sticky/fixed elements

### Changes

**File: `src/components/ui/emoji-picker.tsx`**

1. Add `avoidCollisions={true}` and `collisionPadding={8}` to `PopoverContent` so Radix auto-repositions the picker within the viewport.
2. Make the picker responsive: use `w-[min(320px,calc(100vw-2rem))]` instead of the fixed `w-80` so it fits on narrow screens.
3. Increase z-index to `z-[60]` to ensure it renders above mobile chat chrome (sticky headers, input bars).
4. Add `sideOffset={8}` for better spacing from the input bar.

Single file, 2-3 line changes.

