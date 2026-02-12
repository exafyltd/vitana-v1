

# Page-Level Pull-to-Refresh on Mobile Events Screen

## Problem
The pull-to-refresh gesture currently only works inside the event card carousel area. If you swipe down on the header, tabs, or any area above/outside the cards, nothing happens. The page has `overflow-hidden` which blocks native browser refresh, and the custom pull-to-refresh logic is scoped only to the carousel container.

## Solution
Move the pull-to-refresh touch handling up to the page level in `EventsAndMeetups.tsx` so swiping down anywhere on the mobile screen triggers a refresh -- not just inside the carousel.

## Changes

### 1. `src/pages/community/EventsAndMeetups.tsx`
- Add page-level pull-to-refresh state and touch handlers (same pattern already proven in `MobileEventCarousel`)
- Attach native `touchstart`/`touchmove`/`touchend` listeners with `{ passive: false }` to the outer mobile container div
- When pull threshold is reached, call `fetchEvents()` to refresh all event data
- Render a pull-to-refresh indicator at the top of the mobile layout (sticky pill showing "Pull to refresh" / "Release to refresh" / "Refreshing...")
- The carousel's own pull-to-refresh remains functional as a fallback

### 2. `src/components/community/MobileEventCarousel.tsx`
- No changes needed -- its internal pull-to-refresh still works when scrolling within the cards. The page-level handler will only activate when the touch starts outside the carousel or when the carousel is already at scrollTop 0.

## Technical Details

The page-level handler will:
- Track `touchstart` Y position on the outer container
- On `touchmove`, if scrolling down and the page is at the top, show the pull indicator with resistance factor
- On `touchend`, if pulled past 60px threshold, trigger `fetchEvents()`
- Use `e.preventDefault()` in the touchmove handler to prevent browser overscroll/rubber-banding
- Only activate on mobile (`isMobile` guard)

