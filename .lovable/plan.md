

## Fix: Remove safe-area padding, dock composer flush to device edge

The `ComposerDock` portal currently applies `paddingBottom: max(8px, env(safe-area-inset-bottom))` which adds ~34px on iPhones with a home indicator. This lifts the composer away from the device edge. To match WhatsApp (which renders its input field right at the absolute bottom), we remove this padding entirely.

### Changes — 1 file

**`src/components/messages/ConversationView.tsx`**

**Line 63**: Remove the `paddingBottom` style from the ComposerDock portal container:

```tsx
// BEFORE
<div
  className="fixed left-0 right-0 bottom-0 z-[60]"
  style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
>

// AFTER
<div className="fixed left-0 right-0 bottom-0 z-[60]">
```

**Line 1077**: Simplify the scroll area's bottom padding to only account for composer height (no safe-area addition needed since composer no longer has safe-area padding):

```tsx
// BEFORE
style={{ paddingBottom: 'calc(var(--composer-h, 56px) + env(safe-area-inset-bottom, 0px))' }}

// AFTER
style={{ paddingBottom: 'var(--composer-h, 56px)' }}
```

### Result

```text
┌────────────────────────────┐
│ Header                     │
├────────────────────────────┤
│   Messages (scrollable)    │
│   paddingBottom = composer  │
├────────────────────────────┤ ← fixed bottom-0
│ ╭────────────────╮    🎤   │
│ ╰────────────────╯         │
└────────────────────────────┘ ← device edge, 0px gap
```

Two line edits in one file. No safe-area inset, no extra padding — composer touches the device edge.

