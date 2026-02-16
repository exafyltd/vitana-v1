

## Fix: Remove Remaining "Refreshing" Indicator and Fix Backward Scrolling

### Problem
The "Refreshing..." pill still appears at the top of the Events screen, and backward scrolling remains broken. The previous changes only targeted `MobileEventCarousel.tsx`, but the refresh indicator and possibly additional pull-to-refresh logic lives in a parent component.

### Investigation Needed
Due to connectivity issues, I could not read the files. On implementation, I will:

1. **Search all files** for "Refreshing" text, `pull-to-refresh`, `pullDistance`, `isRefreshing` patterns to find every location
2. **Check parent components** — likely candidates:
   - `src/pages/community/EventsMeetups.tsx` or similar Events page
   - Any layout wrapper around the carousel
   - Mobile-specific wrapper components
3. **Verify MobileEventCarousel.tsx** — confirm previous edits (removing pull-to-refresh, changing `scrollSnapStop` to `'normal'`) were actually saved

### Changes
1. **Remove all pull-to-refresh logic and UI** from whichever parent component contains the "Refreshing..." pill
2. **Confirm `scrollSnapStop: 'normal'`** is set on event card wrappers in MobileEventCarousel
3. **Remove any touch event listeners** (touchstart/touchmove/touchend) that intercept scroll gestures for pull-to-refresh in parent components
4. **Remove the `Loader2` spinner import** if no longer needed

### What Stays the Same
- Card layout, sizing, snap behavior
- All card content and CTA buttons
- Tab navigation (Today/Upcoming/Following)
- Search, Calendar, Create action bar

