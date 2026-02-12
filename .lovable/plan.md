

# In-App Pull-to-Refresh for Mobile Events Page

## Overview
Since the events page intentionally uses `overflow-hidden` to make the carousel the sole scroll surface, native browser pull-to-refresh cannot work. We'll add a custom touch-gesture-based pull-to-refresh directly inside `MobileEventCarousel`.

## Changes

### 1. Revert `overflow-clip` back to `overflow-hidden` (EventsAndMeetups.tsx)

The previous change to `overflow-clip` was an attempt to enable native PTR, which doesn't work reliably with snap containers. Revert both lines (651 and 653) back to `overflow-hidden`.

### 2. Add `onRefresh` prop to MobileEventCarousel

Pass `fetchEvents` from `EventsAndMeetups.tsx` into the carousel:

```
<MobileEventCarousel
  ...existing props...
  onRefresh={fetchEvents}
/>
```

### 3. Implement pull-to-refresh gesture in MobileEventCarousel.tsx

Add touch event handling (`onTouchStart`, `onTouchMove`, `onTouchEnd`) on the snap-scroll container:

- **onTouchStart**: Record start Y position. Only activate if `scrollTop === 0`.
- **onTouchMove**: If pulling down from top, calculate pull distance. Apply `translateY` transform to the container for visual feedback. Show a small refresh indicator pill when pull > 60px.
- **onTouchEnd**: If pull distance > 60px threshold, trigger `onRefresh()`. Otherwise, animate back. Debounce to prevent re-trigger while refreshing.

**Refresh indicator UI**: A sticky pill at the top of the carousel area:
- Centered horizontally, `z-50`, rounded-full
- Shows a spinning `Loader2` icon + "Refreshing..." text
- Semi-transparent background with backdrop blur for premium feel
- Fades in/out with opacity transition

**Key implementation details**:
- Track state: `isPulling`, `pullDistance`, `isRefreshing`
- Use `useCallback` for touch handlers
- During active pull, set `overflow: hidden` on container to prevent snap interference
- After refresh completes (promise resolves), animate `pullDistance` back to 0 and hide indicator
- The touch gesture only activates when `scrollTop <= 0` to avoid interfering with normal snap scrolling

### 4. File changes summary

| File | Change |
|------|--------|
| `src/pages/community/EventsAndMeetups.tsx` | Revert `overflow-clip` to `overflow-hidden` (2 spots). Pass `onRefresh={fetchEvents}` to `MobileEventCarousel`. |
| `src/components/community/MobileEventCarousel.tsx` | Add `onRefresh` prop. Implement touch-based pull-to-refresh gesture with indicator UI. |

No new files or dependencies needed.

