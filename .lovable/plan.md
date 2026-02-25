

## Fix: Anchor Composer to Bottom (WhatsApp-style)

The screenshot shows a large white gap below the composer. The composer is currently inside the flex column flow (`shrink-0`) rather than being fixed to the bottom. The messages area and composer are siblings in a flex column, but the messages area isn't filling all available space properly, leaving dead space below the composer.

### Changes

**1. `src/components/messages/ConversationView.tsx`** — Make composer fixed-positioned

**Line 1156-1197**: Change the composer wrapper from `shrink-0` flex child to `fixed bottom-0 left-0 right-0 z-50`:

```tsx
<div 
  className="conversation-composer fixed bottom-0 left-0 right-0 z-50 bg-background border-t" 
  style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
>
```

**Line 1152**: Remove the `h-1` spacer div and replace with a dynamic bottom padding spacer so messages don't get hidden behind the fixed composer. Add a spacer div with enough height to clear the composer:

```tsx
<div style={{ height: 'calc(var(--composer-h, 56px) + env(safe-area-inset-bottom, 0px) + 8px)' }} />
```

**2. `src/components/messages/MessageInput.tsx`** — No changes needed

The `--composer-h` CSS variable is already being set dynamically. The fixed composer will use this for sizing.

### Result

```text
BEFORE                              AFTER
┌────────────────────────────┐      ┌────────────────────────────┐
│ Header                     │      │ Header                     │
├────────────────────────────┤      ├────────────────────────────┤
│   Messages                 │      │   Messages                 │
│                            │      │   (fills all space)        │
├────────────────────────────┤      │                            │
│ ╭────────────────╮    🎤   │      │   spacer for composer      │
│ ╰────────────────╯         │      ├────────────────────────────┤ ← fixed
│                            │      │ ╭────────────────╮    🎤   │
│   large white gap          │      │ ╰────────────────╯         │
│                            │      │ 8px / safe-area            │
└────────────────────────────┘      └────────────────────────────┘
```

One file changed (`ConversationView.tsx`), two edits: composer positioning and bottom spacer.

