

## Remove Pull-to-Refresh from Mobile Event Cards

### What Changes

Remove all pull-to-refresh logic and UI from `MobileEventCarousel.tsx`. This includes state variables, touch handlers, native event listeners, and the refresh indicator pill.

### File: `src/components/community/MobileEventCarousel.tsx`

1. **Remove pull-to-refresh state** (lines 84-88): `pullDistance`, `isRefreshing`, `startYRef`, `isPullingRef`
2. **Remove constants** (lines 67-69): `PULL_THRESHOLD`, `MAX_PULL`, `RESISTANCE`
3. **Remove touch handler callbacks** (lines 147-191): `handleTouchStart`, `handleTouchMove`, `handleTouchEnd`
4. **Remove native event listener useEffect** (lines 193-207): The block that attaches/detaches touchstart/touchmove/touchend
5. **Remove the refresh indicator UI** (lines 301-325): The floating pill that shows "Pull to refresh" / "Refreshing..."
6. **Remove `Loader2` import** if no longer used elsewhere in the file
7. **Keep the `onRefresh` prop** in the interface (harmless, avoids breaking callers) -- or remove it if preferred

### What Stays the Same
- Card layout, sizing, shadows, rounded corners
- Snap scrolling behavior
- IntersectionObserver tracking
- Keyboard navigation
- All card content and CTA buttons
- The `onRefresh` prop on callers (it simply won't be used)

