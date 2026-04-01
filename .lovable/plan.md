

# Evenly distribute bottom nav items around the central Orb

## Problem
The 4 items currently use `flex-1` which divides the bar into 4 equal columns. But the Orb FAB sits in the center, so the layout needs to account for a "5th slot" in the middle. Inbox and Live need to flank the Orb with appropriate spacing, while Events and Profile sit at the edges.

## Approach
Instead of 4 equal `flex-1` columns, treat the bar as a **5-column grid** where the middle column is an invisible spacer for the Orb. This naturally pushes Inbox left of center and Live right of center, with Events and Profile at the edges — all evenly spaced.

## Change — `src/components/mobile/MobileBottomNav.tsx`

**Container (line 72):** Replace `flex justify-between` with a 5-column grid:
```
grid grid-cols-5
```
Keep all other classes (`px-4`, `pb-safe`, `pt-2`, background, border, etc.).

**Nav items loop (lines 73-80):** After rendering the 2nd item (Inbox), insert an empty `<div />` spacer as the 3rd grid column. This can be done by splitting the render: render first 2 items, then the spacer, then last 2 items.

**Nav item class (line 101):** Keep `flex-1` or remove it (grid children auto-fill). Keep `px-1`.

This gives: `[Events] [Inbox] [Orb space] [Live] [Profile]` — 5 equal columns, perfectly centered around the Orb.

