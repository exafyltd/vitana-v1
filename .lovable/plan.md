
## Shift Event Card CTA Buttons to the Right

The "Buy Ticket" and "Share" buttons at the bottom of mobile event cards overlap with the central Orb. The fix is a single-line CSS change.

### What Changes
The CTA button container in `NewsCard.tsx` (line 443) currently uses `right-4` (16px from the right edge). This will be increased to `right-8` (32px) to shift the buttons further right, clearing the Orb.

### File
- **`src/components/crossover/NewsCard.tsx`** (line 443): Change `right-4` to `right-8`

### What Stays the Same
- Card size, layout, rounded corners, shadows
- Button sizes and styles
- All other card content positioning
- Desktop layout (buttons are already clear of any overlay on desktop)
