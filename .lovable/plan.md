
# Enable Pull-to-Refresh on Mobile Events Page

## Problem
The mobile events page uses `overscrollBehavior: 'contain'` on the snap-scroll container, which blocks the browser's native pull-to-refresh gesture. Every other screen in the app supports swipe-down refresh, but this one does not.

## Root Cause
The CSS property `overscroll-behavior: contain` was added to prevent scroll chaining (so the outer page doesn't scroll when the snap container reaches its boundary). However, this also prevents the browser from triggering its native pull-to-refresh when the user swipes down at the top of the list.

## Solution
Remove `overscrollBehavior: 'contain'` from the snap-scroll container and instead change it to `overscrollBehavior: 'auto'` (or simply remove the property). Since the container already uses `snap-y snap-mandatory`, scroll chaining is naturally limited. Additionally, add an `onRefresh` prop to `MobileEventCarousel` and wire it up in `EventsAndMeetups.tsx` using the existing `fetchEvents` function, so data refreshes when the browser triggers pull-to-refresh.

## Technical Details

### File 1: `src/components/community/MobileEventCarousel.tsx`

**Step 1** - Remove `overscrollBehavior: 'contain'` from the scroll container's style (line 234). Either delete the property entirely or set it to `'auto'`.

```
Before:
  style={{
    height: 'calc(100dvh - 220px)',
    overscrollBehavior: 'contain',
  }}

After:
  style={{
    height: 'calc(100dvh - 220px)',
  }}
```

This single change restores the browser's native pull-to-refresh behavior on the events page, since the outer page scroll will now be allowed to trigger overscroll at the top boundary.

No other files need changes -- the browser handles the refresh natively once `overscrollBehavior: 'contain'` is removed.
