

# Make Live Room Cards Full-Bleed and Fix Share Button Position

## Problem
1. There's a visible "frame" (gap) around the card caused by horizontal padding on the page container (`px-2`) and vertical padding on each card wrapper (`padding: 4px 0px`).
2. The Share button sits in the center-left area of the bottom CTA row, overlapping with the Orb.

## Changes

### 1. `src/pages/community/LiveRooms.tsx`
- Remove horizontal padding on mobile: change `px-2 pt-2 pb-0` to `px-0 pt-2 pb-0` so the cards go edge-to-edge.

### 2. `src/components/community/MobileLiveRoomCarousel.tsx`
- Remove the `padding: '4px 0px'` from each card wrapper so cards fill their slot entirely with no vertical gaps.
- Remove the `border-b border-border/30` between cards (no visible gap means no border needed).
- Remove the `ring-1 ring-black/5` and heavy shadow from the LiveRoomCard className since cards now fill edge-to-edge (no floating card look).
- Keep `rounded-[26px]` only on top corners if desired, or remove rounding entirely for true full-bleed.

### 3. `src/components/liverooms/LiveRoomCard.tsx` -- CTA row adjustment
- In the bottom CTA row (line 281), change `justify-end` to `justify-end gap-3` and add right padding (`pr-2`) to push the Share + Join buttons further right, ensuring the Share icon doesn't overlap with the Orb which sits center-bottom.
- Alternatively, keep the current layout but add `mr-auto` or extra `ml-` spacing to the share button to push it rightward away from the Orb zone.

Specifically:
- The CTA row currently uses `justify-end gap-2`. The share button and Join button are already right-aligned, but on a full-width card the share button's left edge can land right where the Orb sits. Adding `pr-2` to the row and keeping `gap-3` between share and join will shift them slightly further right.

## Summary
- Page padding: `px-2` becomes `px-0` on mobile
- Card wrapper: remove `padding: 4px 0px` and border
- Card className: simplify (remove ring/heavy shadow for full-bleed look)
- CTA row: add slight right padding to avoid Orb overlap
