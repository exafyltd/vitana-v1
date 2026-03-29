

# Fix ORB — Position Fully Above Bottom Nav

## Problem
The ORB is sitting half on the footer nav bar. Current `bottom: calc(72px + 0px + 12px) = 84px` puts the ORB center at the nav boundary, so it overlaps.

## Root cause
The `--appilix-bottom-nav-height` defaults to `72px`, but the actual MobileBottomNav is shorter (~56px with padding). Regardless, 12px gap is insufficient — the ORB itself is ~56px tall, so the bottom of the ORB needs to clear the top of the nav bar entirely.

## Fix — `src/index.css` line 603

Change the mobile bottom value to give proper clearance above the nav:

```css
/* Before */
bottom: calc(var(--appilix-bottom-nav-height, 72px) + env(safe-area-inset-bottom, 0px) + 12px) !important;

/* After — use a simple fixed value that matches the reference screenshots */
bottom: calc(env(safe-area-inset-bottom, 0px) + 96px) !important;
```

This places the ORB's bottom edge at 96px from the viewport bottom, which fully clears the ~56-60px nav bar with visible breathing room — matching the reference screenshots where the ORB floats clearly above the nav.

## Single file change
- `src/index.css` line 603: update bottom value

