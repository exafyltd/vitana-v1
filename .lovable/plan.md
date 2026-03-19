

## Fix: Desktop Right-Click Context Menu Not Opening

### Problem
Line 810 in `MessageBubble.tsx` has `onContextMenu={(e) => e.preventDefault()}` on the message div. This kills **both** the native browser context menu **and** Radix's `ContextMenuTrigger`, which relies on the `contextmenu` event to open. Since Radix never receives the event, the context menu (with quick reactions) never appears on desktop.

On mobile this doesn't matter because `MessageContextMenu` returns bare children (no Radix wrapper), and long-press uses a Drawer instead.

### Fix

**`src/components/messages/MessageBubble.tsx`** (line 810)

Change the `onContextMenu` handler to only `preventDefault` on mobile:

```tsx
// Before:
onContextMenu={(e) => e.preventDefault()}

// After:
onContextMenu={(e) => { if (isMobile) e.preventDefault(); }}
```

This allows Radix's `ContextMenuTrigger` to intercept the right-click on desktop while still suppressing the native menu on mobile (where the Drawer handles actions).

### Files to modify
- `src/components/messages/MessageBubble.tsx` — line 810 only

