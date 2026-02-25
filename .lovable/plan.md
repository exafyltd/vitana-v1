

## Fix: Eliminate White Gap Between Composer and Bottom Nav

### Root Cause

The conversation overlay uses `fixed inset-0 z-50` and the `MobileBottomNav` also uses `fixed bottom-0 z-50`. Since they share the same z-index and the nav renders later in the DOM, the nav appears on top of the conversation. The composer's `paddingBottom: max(6px, env(safe-area-inset-bottom))` then creates a visible gap above the nav bar.

WhatsApp solves this by hiding the tab bar entirely when inside a conversation. The conversation fills the full screen.

### Changes

**1. `src/pages/Messages.tsx`** — Raise conversation overlay z-index

- Line 903: Change `z-50` to `z-[55]` on the conversation container
- This puts the conversation above the bottom nav (z-50) and the orb (z-[53]), fully covering them during a chat — exactly like WhatsApp

**2. No other changes needed**

The composer already has correct bottom safe-area padding (`max(6px, env(safe-area-inset-bottom))`). Once the conversation overlay sits above the nav bar, the composer will be flush with the bottom of the screen with only the safe-area inset below it — no more white gap.

### Result

```text
BEFORE                              AFTER
┌────────────────────────────┐      ┌────────────────────────────┐
│ Header                     │      │ Header                     │
├────────────────────────────┤      ├────────────────────────────┤
│                            │      │                            │
│   Messages                 │      │   Messages                 │
│                            │      │   (more vertical space)    │
│                            │      │                            │
├────────────────────────────┤      ├────────────────────────────┤
│ ╭────────────────╮    🎤   │      │ ╭────────────────╮    🎤   │
│ ╰────────────────╯         │      │ ╰────────────────╯         │
│                            │      │ safe-area-bottom (6px)     │
│   ~60px white gap          │      └────────────────────────────┘
├────────────────────────────┤      (bottom nav hidden behind overlay)
│ Events  Business 🔮 Live   │
└────────────────────────────┘
```

One line change in one file. The bottom nav is simply covered by the conversation — matching WhatsApp where the tab bar disappears when you open a chat thread.

