

## Problem

Profile stats are hardcoded in two places:
- **`PublicProfilePage.tsx`** — `stats: { posts: 0, followers: 0, following: 0, mediaUploads: 0, groupsJoined: 0 }` (always zero)
- **`EditProfilePage.tsx`** — `stats: { posts: 124, followers: 1205, following: 487, mediaUploads: 89, groupsJoined: 12 }` (dummy data)

These flow into `ProfileStats` (desktop) and `MobileProfileStats` (mobile), which display the hardcoded values.

## Plan

### 1. Create `useProfileStatsCount` hook

**New file: `src/hooks/useProfileStatsCount.ts`**

A lightweight hook that runs three parallel count queries via React Query:

| Stat | Table | Filter |
|------|-------|--------|
| Posts | `profile_posts` | `user_id = userId` |
| Media | `profile_gallery` count + `media_uploads` count | `user_id = userId` |
| Groups | `global_community_group_members` | `user_id = userId` |

Uses `select('id', { count: 'exact', head: true })` for efficient count-only queries. Cache key: `['profile-stats-count', userId]`.

### 2. Wire hook into `ProfileStats` (desktop)

**File: `src/components/profile/shared/ProfileStats.tsx`**

Call `useProfileStatsCount(profile.id)` and display its `postsCount`, `mediaCount`, `groupsCount` instead of `profile.stats.posts`, `profile.stats.mediaUploads`, `profile.stats.groupsJoined`. Show skeleton placeholders while loading.

### 3. Wire hook into `MobileProfileStats` (mobile)

**File: `src/components/profile/mobile/MobileProfileStats.tsx`**

Refactor to accept a `userId` prop, call `useProfileStatsCount(userId)` internally, and display real counts. Show skeleton while loading.

### 4. Update callers to pass `userId`

**Files: `ProfileLayout.tsx`, `EditProfilePage.tsx`**

Replace the hardcoded `postsCount`/`mediaCount`/`groupsCount` props with `userId={profileUserId}` for `MobileProfileStats`. The desktop `ProfileStats` already receives `profile` which contains `profile.id`.

### 5. Remove hardcoded stats

**Files: `PublicProfilePage.tsx`, `EditProfilePage.tsx`**

The `stats` object in the `UserProfile` construction can remain (type requires it) but the display components will no longer read from it — they'll use the hook.

---

**Files changed:** 5 (1 new hook, 4 existing components)
**No database or RLS changes needed** — these are all SELECT queries on tables that already have public-read RLS policies.

