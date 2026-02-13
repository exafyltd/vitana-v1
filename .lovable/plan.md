

# Compress Live Rooms Mobile Layout (Match Events Pattern)

## Problem
The Live Rooms screen on mobile has excessive spacing: `p-6` padding all around, a `mt-6` gap before the tab bar, and the SplitBarList uses a rigid `grid w-full grid-cols-3` layout that doesn't match the Events page's clean scrollable pill style. Too much vertical space is consumed before the actual content.

## Changes

### File: `src/pages/community/LiveRooms.tsx`

1. **Mobile-specific container styling** -- Replace the single `p-6 pb-24` div with conditional classes:
   - Mobile: `px-2 pt-2 pb-0 h-[100dvh] overflow-hidden` (matching Events)
   - Desktop: keep `p-6 pb-24 min-h-screen`

2. **Compress the SplitBar margin** -- Change `mt-6` to `mt-2` on mobile for the SplitBar wrapper

3. **Fix the SplitBarList** -- Remove the `grid w-full grid-cols-3` class and let it use the default flex/scrollable pill layout from the SplitBar component (same as Events). Add `mb-2` on mobile instead of the default `mb-6`.

4. **Tighten SplitBarContent spacing** -- Use `mt-1` on mobile (like Events does) instead of `mt-6`

### Summary of visual changes
- Page padding shrinks from 24px to 8px on mobile
- Gap between action bar and tabs shrinks from 24px to 8px
- Tab pills use the standard flex-scroll layout instead of rigid 3-column grid
- Gap below tabs before cards shrinks
- Overall: ~80px of vertical space recovered, giving more room for the live room cards

