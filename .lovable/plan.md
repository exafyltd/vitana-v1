

## Fix: Remove double safe-area top padding causing header gap

### Problem

The conversation header appears pushed down from the top edge because safe-area top padding is applied **twice**:

1. **Line 904 in `Messages.tsx`** — the full-screen overlay wrapper has `paddingTop: 'env(safe-area-inset-top, 0px)'`
2. **Line 1006 in `ConversationView.tsx`** — the header itself also has `paddingTop: 'env(safe-area-inset-top, 0px)'`

This creates a visible white gap between the status bar and the header content.

### Changes — 1 file

**`src/pages/Messages.tsx` — Line 904**

Remove the `paddingTop` style from the overlay container since the header inside `ConversationView` already handles it:

```tsx
// BEFORE
<div 
  className="fixed inset-0 z-[55] flex flex-col bg-background"
  style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
>

// AFTER
<div className="fixed inset-0 z-[55] flex flex-col bg-background">
```

### Result

The header background extends behind the status bar and its content sits immediately below it — exactly where the Top App Bar normally lives. No double gap.

