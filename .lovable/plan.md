
# Remove Event Card Counter ("1/65")

## What changes
Remove the floating counter badge (showing "1 / 65", "2 / 65", etc.) from the bottom-right corner of mobile event cards in the snap-scroll carousel.

## Technical details

**File: `src/components/community/MobileEventCarousel.tsx`**
- Delete lines 263-268: the entire `{/* Floating counter */}` block that renders the `currentIndex + 1 / events.length` badge
- If `currentIndex` state is no longer used elsewhere, also clean up that state variable and the IntersectionObserver logic that updates it (will verify during implementation)
