

## Fix: Smooth Backward Scrolling on Mobile Event Cards

### Problem
Scrolling backward (upward) through event cards is significantly harder than scrolling forward. The scroll feels "sticky" and resists momentum.

### Root Cause
In `MobileEventCarousel.tsx` (line 347), each card wrapper has `scrollSnapStop: 'always'`. This CSS property forces the browser to stop at **every** snap point, fighting against scroll momentum. Combined with `snap-mandatory`, it creates a one-way-door effect where flicking backward feels much harder than going forward (gravity assists downward flicks but works against upward ones).

### Fix
**File: `src/components/community/MobileEventCarousel.tsx`** (line 347)

Change `scrollSnapStop: 'always'` to `scrollSnapStop: 'normal'`.

This allows the browser's native scroll momentum to carry through naturally in both directions while still snapping to the nearest card when the scroll settles.

### What Stays the Same
- Card sizes, layout, shadows, rounded corners
- Snap-to-card behavior (cards still snap into place)
- Pull-to-refresh functionality
- IntersectionObserver tracking
- All other visual and interaction patterns
