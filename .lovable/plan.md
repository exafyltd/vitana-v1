

## Problem

Both the mobile (`MobileGroupsTabContent`) and desktop (`ProfileGroupsTab`) groups tabs display hardcoded mock data instead of querying the user's actual group memberships from the database.

The database tables already exist:
- **`global_community_groups`** — stores group details (name, description, category, cover_url, avatar_url, member_count, status)
- **`global_community_group_members`** — stores membership links (user_id, group_id, role, joined_at)

## Plan

### 1. Create `useUserGroups` hook

**New file: `src/hooks/useUserGroups.ts`**

A React Query hook that:
- Queries `global_community_group_members` filtered by `user_id`
- Joins with `global_community_groups` to get group details (name, description, category, cover_url, avatar_url, member_count)
- Returns the user's groups with their role in each
- Falls back to the existing wellness cover images (from `generateGroupImage`) when `cover_url` is null
- Cache key: `['user-groups', userId]`

### 2. Update `MobileGroupsTabContent` (mobile)

**File: `src/components/profile/mobile/MobileGroupsTabContent.tsx`**

- Accept a `userId` prop
- Call `useUserGroups(userId)` internally
- Remove `PLACEHOLDER_GROUPS` constant
- Show loading skeleton while fetching
- Display real groups using the existing card layout (avatar, name, member count, chevron)

### 3. Update `ProfileGroupsTab` (desktop)

**File: `src/components/profile/shared/tabs/ProfileGroupsTab.tsx`**

- Call `useUserGroups(profile.user_id || profile.id)` instead of using `mockCommunities`
- Map real data into the existing card design (cover image, role badge, member count, description)
- Use `generateGroupImage(group.id)` as fallback when `cover_url` is null — preserving the current visual style
- Show loading skeleton while fetching

### 4. Wire `userId` into callers

**Files: `ProfileLayout.tsx`, `EditProfilePage.tsx`**

- Pass `userId={profileUserId}` (or `user?.id`) to `MobileGroupsTabContent`
- `ProfileGroupsTab` already receives `profile`, so it can derive the userId internally

### Summary

| File | Change |
|------|--------|
| `src/hooks/useUserGroups.ts` | New hook — queries group memberships with group details |
| `MobileGroupsTabContent.tsx` | Accept `userId`, use hook, remove mock data |
| `ProfileGroupsTab.tsx` | Use hook instead of `mockCommunities`, keep existing card design |
| `ProfileLayout.tsx` | Pass `userId` to `MobileGroupsTabContent` |
| `EditProfilePage.tsx` | Pass `userId` to `MobileGroupsTabContent` |

No database or RLS changes needed — the tables and relationships already exist.

