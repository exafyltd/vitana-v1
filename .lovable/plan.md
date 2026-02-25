

## Fix: Increase scroll area bottom padding to account for safe-area + reduce composer internal padding

### Problem

Two issues from the screenshot:

1. **Last message is cut off** — the scroll area's `paddingBottom` is `var(--composer-h, 56px)` but the composer now also has `env(safe-area-inset-bottom)` padding. The scroll area doesn't account for this extra height, so the last message hides behind the composer.

2. **Composer still has visual gap** — the `py-1.5` inner padding and `border-t` + `box-shadow` add unnecessary vertical space. We can tighten these.

### Changes — 2 files

**1. `src/components/messages/ConversationView.tsx`**

**Line 1076** — Update scroll area padding to include safe-area inset so messages aren't hidden:

```tsx
// BEFORE
style={{ paddingBottom: 'var(--composer-h, 56px)' }}

// AFTER
style={{ paddingBottom: 'calc(var(--composer-h, 56px) + env(safe-area-inset-bottom, 0px))' }}
```

**Line 1171-1172** — Reduce composer inner padding from `py-1.5` to `py-1` and remove the border-t (shadow is enough):

```tsx
// BEFORE
<div className="conversation-composer bg-background border-t" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
  <div className="px-2 py-1.5">

// AFTER
<div className="conversation-composer bg-background" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
  <div className="px-2 py-1">
```

**2. `src/index.css`** — Line 767 — Remove the box-shadow to eliminate the visual separator gap:

```css
/* BEFORE */
.conversation-composer {
  flex-shrink: 0;
  z-index: 20;
  margin-bottom: 0;
  box-shadow: 0 -2px 8px -2px hsl(var(--border) / 0.15);
}

/* AFTER */
.conversation-composer {
  flex-shrink: 0;
  z-index: 20;
  margin-bottom: 0;
  box-shadow: none;
}
```

### Result

- Scroll area now has enough bottom padding so the last message is fully visible above the composer
- Composer sits tighter to the bottom edge with reduced internal padding
- No border or shadow adding visual height

