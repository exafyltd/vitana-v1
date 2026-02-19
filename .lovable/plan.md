

## Fix Like Count on Shorts

### Problem
When you tap the heart on a Short, it turns red correctly, but the number below stays at 0 (or whatever the original count was). The like action only toggles a local state flag without updating the count or persisting to the database.

### Root Cause
- `MobileShortsFeed.handleLike` toggles a `Set<string>` for visual state only
- The displayed count comes from `video.likes` which is the original database value, never modified
- No database mutation (`useToggleLike`) is called

### Solution
1. **Track local like count adjustments** in `MobileShortsFeed` so the UI updates instantly (optimistic update)
2. **Call the `useToggleLike` mutation** to persist the like to the database
3. **Pass the adjusted count** to `MobileShortSlide` instead of the raw `video.likes`

### Technical Details

**File: `src/components/community/MobileShortsFeed.tsx`**

- Import `useToggleLike` from `@/hooks/useShorts`
- Add a `likeCounts` state (`Map<string, number>`) initialized from `shorts` data to track per-video counts locally
- Update `handleLike` to:
  - Toggle the liked state (existing)
  - Increment or decrement the local count in `likeCounts`
  - Call `toggleLike.mutate(videoId)` to persist to DB
- Pass the local count to each `MobileShortSlide` via the `video.likes` prop

**File: `src/components/community/MobileShortSlide.tsx`**

- No changes needed -- it already displays `video.likes`, so passing the updated value is sufficient

### Flow After Fix

1. User taps heart
2. Heart turns red (existing) AND count increments from 0 to 1 immediately
3. Database mutation fires in the background to persist the new count
4. On unlike (tap again), count decrements and visual resets

