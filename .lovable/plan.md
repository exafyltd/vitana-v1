

# Lower the ORB to Anchor It to the Bottom Nav

## What's changing

The mobile ORB is currently positioned with `bottom: calc(var(--appilix-bottom-nav-height, 72px) - 28px)`, which places it about halfway overlapping the nav bar. The user wants it lower — more anchored/attached to the bottom nav.

## Plan

**File: `src/index.css` (line 615)**

Change the bottom offset from `-28px` to `-36px` (or similar), which pushes the ORB down so it overlaps more with the nav bar, feeling more anchored:

```css
/* Before */
bottom: calc(var(--appilix-bottom-nav-height, 72px) - 28px) !important;

/* After — sits lower, more anchored to the nav */
bottom: calc(var(--appilix-bottom-nav-height, 72px) - 36px) !important;
```

This moves the ORB ~8px lower, so roughly 60% of it overlaps the nav bar instead of 50%, giving a more grounded/anchored feel as shown in the screenshot.

Single line change in `src/index.css`.

