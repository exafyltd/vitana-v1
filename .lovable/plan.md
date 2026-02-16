

## Fix: Shift CTA Buttons Further Right (Away from Orb)

The previous change went the wrong direction. `right-8` (32px) pushes buttons further *from* the right edge, toward the center Orb. We need to reduce the right offset to keep buttons snug against the right edge.

### Change
- **`src/components/crossover/NewsCard.tsx`** (line 443): Change `right-8` to `right-2` (8px from right edge)

This pulls the "Buy Ticket" and "Share" buttons tighter to the right side of the card, away from the centered Orb.

### What Stays the Same
- Card size, layout, corners, shadows
- Button sizes, styles, and stacking
- All other content positioning
- Desktop layout

