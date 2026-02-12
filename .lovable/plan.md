

# Fix Pull-to-Refresh on Mobile Events Page

## Problem
Removing `overscrollBehavior: 'contain'` wasn't enough. The real blocker is the **parent container** on line 651 of `EventsAndMeetups.tsx`, which applies `overflow-hidden` on mobile. This creates a clipping boundary that prevents any scroll event from reaching the browser's document level, making native pull-to-refresh impossible.

## Root Cause
The outer wrapper div has:
```
h-[100dvh] overflow-hidden
```
This tells the browser "nothing scrolls here, clip everything." The snap-scroll container inside it scrolls internally, but its overscroll can never propagate to the browser because the parent blocks it.

## Solution
Change `overflow-hidden` to `overflow-clip` on mobile for the outer container. `overflow-clip` provides the same visual clipping (no scrollbars, content doesn't visually leak) but does **not** create a new scroll container, so overscroll from the child snap container can propagate to the browser and trigger pull-to-refresh.

## Technical Details

### File: `src/pages/community/EventsAndMeetups.tsx` (line 651)

Change the mobile class from `overflow-hidden` to `overflow-clip`:

```
Before:
isMobile ? "px-2 pt-2 pb-0 h-[100dvh] overflow-hidden" : "p-6 min-h-screen"

After:
isMobile ? "px-2 pt-2 pb-0 h-[100dvh] overflow-clip" : "p-6 min-h-screen"
```

### File: `src/pages/community/EventsAndMeetups.tsx` (line 653)

Also change the inner flex container from `overflow-hidden` to `overflow-clip` for the same reason:

```
Before:
<div className="flex-1 overflow-hidden">

After:
<div className="flex-1 overflow-clip">
```

Two single-word changes. The visual layout stays identical, but the browser can now detect overscroll at the top of the events list and trigger its native pull-to-refresh gesture.
