

## Fix: Remove bottom margin pushing composer away from device edge

### Root Cause

The `.conversation-composer` class in `src/index.css` (line 766) has:

```css
margin-bottom: calc(var(--comm-dock-h, 72px) + 8px + env(safe-area-inset-bottom));
```

This was designed to lift the composer above the bottom navigation dock. But in the chat conversation view, the bottom nav is **hidden** (the conversation overlay covers it at z-[55]). So this 72px+ margin creates a huge white gap between the input and the device edge.

Additionally, `viewport-fit=cover` is missing from `index.html`, so `env(safe-area-inset-bottom)` always resolves to `0px`.

### Fix — 2 files

**1. `src/index.css`** — Lines 762-783

Since the composer is now portaled to `document.body` with `fixed bottom-0`, it no longer needs `margin-bottom` at all. Remove it:

```css
/* BEFORE */
.conversation-composer {
  flex-shrink: 0;
  z-index: 20;
  margin-bottom: calc(var(--comm-dock-h, 72px) + 8px + env(safe-area-inset-bottom));
  box-shadow: 0 -2px 8px -2px hsl(var(--border) / 0.15);
}

@media (max-width: 768px) {
  .conversation-composer {
    margin-bottom: calc(var(--comm-dock-h, 72px) + 4px + env(safe-area-inset-bottom));
  }
}

/* AFTER */
.conversation-composer {
  flex-shrink: 0;
  z-index: 20;
  margin-bottom: 0;
  box-shadow: 0 -2px 8px -2px hsl(var(--border) / 0.15);
}
```

**2. `index.html`** — Line 5

Add `viewport-fit=cover` so `env(safe-area-inset-bottom)` actually works on iOS:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover" />
```

### Result

```text
┌────────────────────────────┐
│ Messages (scrollable)      │
│                            │
│   last message             │
├────────────────────────────┤ ← fixed bottom-0, margin-bottom: 0
│ ╭────────────────╮    🎤   │ ← input controls
│ ╰────────────────╯         │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← bg fills safe-area (via paddingBottom)
└────────────────────────────┘ ← device edge
```

Two files, three line changes. The 72px phantom margin is eliminated.

