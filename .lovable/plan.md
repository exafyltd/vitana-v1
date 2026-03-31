

# Hide ORB When Event Drawer Is Open (Mobile Only)

## Problem
The MeetupDetailsDrawer opens as a fullscreen sheet on mobile, but the bottom nav remains mounted underneath. Since `data-bottom-nav-visible="true"` is still set, the ORB suppression rule doesn't trigger.

## Solution
Same pattern used for the shorts overlay: set a body attribute when the drawer is open, add a CSS suppression block.

## Changes

### 1. `src/components/meetups/MeetupDetailsDrawer.tsx`
Add a `useEffect` that sets `document.body.dataset.drawerOpen = "true"` when `open` is true, and removes it on close/unmount. Gate this behind mobile check (`window.innerWidth < 1024`) so desktop is unaffected.

### 2. `src/index.css`
Add a new suppression block after the shorts one (same 8 selectors):

```css
/* Suppress ORB when fullscreen drawer is open on mobile */
body[data-drawer-open="true"] .vtorb-fab,
body[data-drawer-open="true"] .vitana-orb,
body[data-drawer-open="true"] [data-vitana-orb="true"],
body[data-drawer-open="true"] #vitana-orb,
body[data-drawer-open="true"] .OrbFloatingButton,
body[data-drawer-open="true"] #vitana-orb-fab,
body[data-drawer-open="true"] [id^="vitana-orb"],
body[data-drawer-open="true"] [class^="vtorb-fab"] {
  z-index: 0 !important;
  pointer-events: none !important;
  opacity: 0 !important;
}
```

## Files
- `src/components/meetups/MeetupDetailsDrawer.tsx` — add body attribute effect
- `src/index.css` — add drawer suppression block

