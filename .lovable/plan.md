

# Fix Pull-to-Refresh: Use Native Non-Passive Touch Listeners

## Problem
The current implementation attaches touch handlers via React's `onTouchStart`/`onTouchMove`/`onTouchEnd` JSX props. In modern browsers, React registers touch event listeners as **passive** by default on scroll containers. This means:

1. `e.preventDefault()` cannot be called (it's ignored in passive listeners)
2. The browser consumes the touch-move as a scroll gesture before our handler can intercept it
3. At `scrollTop === 0`, the downward drag either rubber-bands or does nothing -- our pull-to-refresh logic never gets a chance to take control

## Solution
Replace the React JSX touch handlers with **native event listeners** attached via `useEffect`, using `{ passive: false }`. This allows us to call `e.preventDefault()` when we detect a pull-down gesture at the top, preventing the browser from treating it as a scroll.

## Technical Details

### File: `src/components/community/MobileEventCarousel.tsx`

**Step 1** -- Remove JSX touch handlers from the scroll container div (lines 320-322):
```
Remove:
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
```

**Step 2** -- Convert handlers to use native `TouchEvent` instead of `React.TouchEvent`:
- `handleTouchStart(e: TouchEvent)` 
- `handleTouchMove(e: TouchEvent)` -- add `e.preventDefault()` when actively pulling down
- `handleTouchEnd()` -- stays the same

**Step 3** -- Add a `useEffect` that attaches native listeners with `{ passive: false }`:

```
useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  el.addEventListener('touchstart', handleTouchStart, { passive: true });
  el.addEventListener('touchmove', handleTouchMove, { passive: false });
  el.addEventListener('touchend', handleTouchEnd, { passive: true });

  return () => {
    el.removeEventListener('touchstart', handleTouchStart);
    el.removeEventListener('touchmove', handleTouchMove);
    el.removeEventListener('touchend', handleTouchEnd);
  };
}, [handleTouchStart, handleTouchMove, handleTouchEnd]);
```

**Step 4** -- In `handleTouchMove`, call `e.preventDefault()` when pull distance is positive (user is pulling down from top):

```
const handleTouchMove = useCallback((e: TouchEvent) => {
  if (!isPullingRef.current || isRefreshing || !containerRef.current) return;
  if (containerRef.current.scrollTop > 0) {
    isPullingRef.current = false;
    setPullDistance(0);
    return;
  }
  const deltaY = e.touches[0].clientY - startYRef.current;
  if (deltaY > 0) {
    e.preventDefault(); // <-- This is the critical fix
    const distance = Math.min(deltaY * RESISTANCE, MAX_PULL);
    setPullDistance(distance);
  } else {
    setPullDistance(0);
  }
}, [isRefreshing]);
```

### Summary of changes

| What | Detail |
|------|--------|
| File changed | `src/components/community/MobileEventCarousel.tsx` only |
| Root cause | React registers touch listeners as passive; `preventDefault()` is ignored |
| Fix | Use native `addEventListener` with `{ passive: false }` for `touchmove` |
| Risk | None -- `preventDefault` only fires when at top and pulling down, so normal snap scrolling is unaffected |

