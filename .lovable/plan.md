
# Fix: Events Not Showing on Mobile

## Root Cause

The recent vertical snap-scroll refactor of `MobileEventCarousel` created a **nested scrolling conflict**. The snap-scroll container uses a fixed height (`calc(100dvh - 216px)`), but it sits inside multiple parent containers that also scroll:

```text
div.p-6.min-h-screen              (page wrapper - scrolls)
  div.flex-1.overflow-y-auto       (content area - also scrolls!)
    SplitBarContent                 (tab panel)
      MobileEventCarousel
        div.overflow-y-auto         (snap container - tries to scroll too)
```

The snap container likely collapses to zero visible height or its cards are rendered but hidden behind the competing scroll contexts. The empty state does NOT appear (which would show "No Upcoming Events" text), confirming events are being passed to the component -- they're just invisible due to CSS layout issues.

## Fix

### 1. `MobileEventCarousel.tsx` -- Remove fixed height, use flex-grow

The snap container should NOT use a hardcoded `calc(100dvh - 216px)` height. Instead, it should fill whatever space its parent gives it using `flex: 1` / `h-full`. The parent page layout needs to provide the constraint.

- Change the snap container from a fixed `height` style to `flex: 1; min-height: 0` so it fills available space
- Keep `overflow-y-auto`, `snap-y`, `snap-mandatory` and `overscroll-behavior` on the container
- Keep `scroll-snap-align: start` and `scroll-snap-stop: always` on each card wrapper
- Each card wrapper's `min-height` should remain `calc(100dvh - 216px)` -- this is the size of each "page", not the container

### 2. `EventsAndMeetups.tsx` -- Fix parent layout for mobile

On mobile, the page wrapper and content area create competing scroll surfaces. The fix:

- On mobile, make the content area (`div.flex-1.overflow-y-auto` at line 713) use `overflow: hidden` instead of `overflow-y-auto`, so the only scrolling surface is the snap container inside `MobileEventCarousel`
- Alternatively, remove the `overflow-y-auto` on the parent and let the snap container be the sole scroll owner

### 3. Ensure the outer page container doesn't scroll on mobile

The `div.p-6.min-h-screen` wrapper (line 649) implies the page itself can scroll. On mobile, when the snap carousel is active, this outer scroll should be suppressed so only the snap container handles scrolling. This can be done by conditionally adding `overflow: hidden; height: 100dvh` to the page wrapper on mobile when showing the carousel tabs.

## Summary of Changes

| File | Change |
|------|--------|
| `MobileEventCarousel.tsx` | Replace fixed container height with `flex: 1; min-height: 0; height: 100%` so it fills parent space. Keep card wrapper min-height as the viewport "page" size. |
| `EventsAndMeetups.tsx` | On mobile: suppress outer scrolling (`overflow: hidden`) on parent containers so the snap container is the sole scroll surface. Ensure the layout chain from page root to carousel is a proper flex column with constrained height. |

These are minimal CSS/layout changes -- no logic, data, or component structure changes needed.
