

## Problem

Multiple components (`ProfileLayout`, `ProfileStats`, `ProfileIdCardFront`) each call `useFollow(profile.id)` independently. Each creates its own local state (`followersCount`, `isFollowing`). When the follow button in `ProfileLayout` or `ProfileIdCardFront` does an optimistic update (`setFollowersCount(prev => prev + 1)`), that only updates its own local state. The `ProfileStats` component's separate `useFollow` instance doesn't see it until the realtime subscription fires (which can be slow or unreliable).

## Solution

Stop duplicating `useFollow` calls. Instead, call `useFollow` once at the top level (`ProfileLayout`) and pass the follow data down to child components that need it.

### Changes

**1. `src/components/profile/shared/ProfileLayout.tsx`**
- Already calls `useFollow(profile.id)` — extend it to also destructure `followersCount` and `followingCount`
- Pass these values down to `ProfileStats` as props

**2. `src/components/profile/shared/ProfileStats.tsx`**
- Add optional `followersCount` and `followingCount` props
- When provided, use props instead of calling `useFollow` internally
- Remove the internal `useFollow` call when props are supplied

**3. `src/components/profile/shared/ProfileIdCardFront.tsx`**
- This component also has its own `useFollow` — accept follow state as props from the parent (`ProfileLayout`) to stay in sync
- Alternatively, since this is the desktop ID card and may render independently, keep its own `useFollow` but ensure the realtime subscription works

The simplest and most impactful fix: **ProfileStats should accept followersCount/followingCount as props** from the parent that already has the optimistic-update-aware state, eliminating the duplicate hook call.

### Files to modify
| File | Change |
|------|--------|
| `ProfileStats.tsx` | Accept optional `followersCount`/`followingCount` props; skip internal `useFollow` when provided |
| `ProfileLayout.tsx` | Destructure `followersCount`/`followingCount` from existing `useFollow` call; pass to `ProfileStats` |

This is a 2-file, minimal change that ensures the optimistic count update from the follow button instantly reflects in the stats display.

