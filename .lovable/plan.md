

## Fix: Eliminate white space between composer and device navigation

### Problem
The `ComposerDock` portal sits at `fixed bottom-0`, but on devices with a home indicator / navigation bar, the system's safe area below the composer is not covered by the composer's background — leaving a visible white gap.

### Root Cause
We previously removed `paddingBottom: env(safe-area-inset-bottom)` entirely. This was correct for not **lifting** the composer, but wrong for not **extending** its background through the safe area. WhatsApp solves this by making the composer's background color fill the safe area zone while keeping the interactive content above it.

### Fix — 1 file, 1 change

**`src/components/messages/ConversationView.tsx`** — line 1171

Add `pb-[env(safe-area-inset-bottom)]` to the inner composer div (the one with `bg-background`). This extends the opaque background through the safe area without lifting the input controls.

```tsx
// BEFORE (line 1171)
<div className="conversation-composer bg-background border-t">
  <div className="px-2 py-1.5">

// AFTER
<div 
  className="conversation-composer bg-background border-t"
  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
>
  <div className="px-2 py-1.5">
```

### How it works

```text
┌────────────────────────────┐
│ Messages                   │
├────────────────────────────┤ ← fixed bottom-0
│ ╭────────────────╮    🎤   │ ← interactive area (py-1.5)
│ ╰────────────────╯         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← bg-background fills safe-area
├────────────────────────────┤ ← device nav bar edge
│ ◁       ○       □          │
└────────────────────────────┘
```

The background extends down, the input stays where it is. One line change.

