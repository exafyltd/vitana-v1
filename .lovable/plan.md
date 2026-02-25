

## Fix: Push conversation header flush to the top edge

### Problem

The conversation header (line 1006-1007) has `py-2` padding and sits below the Top App Bar. On mobile, the conversation overlay covers the entire screen at `z-[55]`, so the header should extend flush to the very top of the device screen — behind the status bar — just like the reference screenshot shows.

### Changes — 1 file

**`src/components/messages/ConversationView.tsx`**

**Line 1006-1007** — Add top padding equal to the safe-area inset so the header extends behind the status bar, and reduce vertical padding:

```tsx
// BEFORE
<div className="shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
  <div className="flex items-center justify-between px-3 py-2">

// AFTER
<div className="shrink-0 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
  <div className="flex items-center justify-between px-3 py-1.5">
```

This makes the header background extend up behind the system status bar (using safe-area padding), while the actual content (back button, avatar, name) sits just below it. The `py-2` → `py-1.5` tightens the toolbar vertically to match the reference screenshot's compact header.

### Result

```text
┌────────────────────────────┐ ← device top edge
│ ▓▓▓▓▓ status bar ▓▓▓▓▓▓▓▓ │ ← header bg extends behind this
├────────────────────────────┤ ← env(safe-area-inset-top)
│ ← Avatar  Name     📞 🎥  │ ← compact toolbar (py-1.5)
├────────────────────────────┤ ← border-b
│ Messages...                │
```

One file, two line changes. The header sits flush against the top edge with the background extending behind the status bar.

