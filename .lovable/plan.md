

## Hide Bottom Navigation During Shorts Playback

### Problem
The Shorts full-screen feed and the bottom navigation bar both use `z-50`, causing them to stack at the same level. The bottom nav bleeds through the shorts viewer.

### Solution
Increase the z-index of `MobileShortsFeed` from `z-50` to `z-[60]` so it renders above the bottom navigation bar. This is the cleanest fix because the shorts feed is already a `fixed inset-0` overlay -- it just needs to sit on top of everything.

### Technical Details

**File to modify:** `src/components/community/MobileShortsFeed.tsx`

- Change the container's class from `z-50` to `z-[60]`
- Also update the progress indicator from `z-20` to `z-[62]` so it stays above the feed

This single change ensures the full-screen shorts experience covers the entire viewport, including the bottom nav and the orb, while the existing back arrow in the upper-left corner remains the exit mechanism.

