

## Problem

The Groups feature is broken end-to-end on mobile:

1. **404 bug**: `MobileGroupsTabContent` and `ProfileGroupsTab` navigate to `/community/groups` and `/community/groups/${groupId}` — routes that don't exist in `App.tsx`. The only existing group route is `/comm/my-groups/:id`.
2. **Groups Directory**: The `Groups.tsx` page exists but has hardcoded empty-state tabs — no real data.
3. **Group Detail**: `GroupDetail.tsx` is fully hardcoded mock content (fake group name, fake members, fake chat).
4. **Create Group**: `CreateGroupPopup` shows a toast but never inserts into the database.
5. **Join/Leave**: No mechanism exists to join or leave a group.

## Existing Infrastructure

The database is ready:
- `global_community_groups` — has `name`, `description`, `category`, `cover_url`, `avatar_url`, `member_count`, `is_public`, `status`, `created_by`
- `global_community_group_members` — has `group_id`, `user_id`, `role`, `joined_at`
- RLS policies exist for both tables (community users can view public/approved groups, users can join, creators can manage)
- `useUserGroups(userId)` hook already works for fetching a user's memberships

## Plan

### 1. Fix routing (App.tsx)

Add three routes under `/comm/`:
- `/comm/groups` → `Groups` page (directory)
- `/comm/groups/:id` → `GroupDetail` page
- Redirect `/community/groups` → `/comm/groups` and `/community/groups/:id` → `/comm/groups/:id`

### 2. Fix navigation URLs in components

Update all `navigate('/community/groups...')` calls to `/comm/groups...` in:
- `MobileGroupsTabContent.tsx` (3 navigations)
- `ProfileGroupsTab.tsx` (2 navigations)
- `GroupMatchCard.tsx`, `HealthMasterActionPopup.tsx`, `IntentRouter.tsx`, `RelatedCommunityPreview.tsx`

### 3. Create `useGroupDirectory` hook

New hook to fetch all public/approved groups for the directory page, with optional search filter. Uses `global_community_groups` table.

### 4. Create `useGroupMembership` hook

New hook providing:
- `joinGroup(groupId)` — inserts into `global_community_group_members` with `role: 'member'`, invalidates `['user-groups']` and `['group-directory']` caches
- `leaveGroup(groupId)` — deletes from `global_community_group_members`, invalidates caches
- `isMember(groupId)` — checks membership status

### 5. Wire Groups Directory page (`Groups.tsx`)

Replace the hardcoded empty tabs with real content:
- **"My Groups" tab**: Uses existing `useUserGroups(currentUserId)` to show joined groups with cover image cards
- **"Recommended" tab**: Uses `useGroupDirectory` to show all public groups the user hasn't joined, with search and Join/Leave buttons
- Each card uses `generateGroupImage(group.id)` as fallback cover

### 6. Wire Group Detail page (`GroupDetail.tsx`)

Fetch the group by ID from `global_community_groups`. Display:
- Real cover image, name, description, member count, category
- Join/Leave button using `useGroupMembership`
- Members preview (query `global_community_group_members` joined with profiles)
- Placeholder for future group feed

### 7. Wire Create Group popup (`CreateGroupPopup.tsx`)

Replace the toast-only `handleSubmit` with a real Supabase insert:
- Insert into `global_community_groups` with `created_by: auth.uid()`, `status: 'approved'`, `is_public: true`
- Auto-insert creator into `global_community_group_members` with `role: 'admin'`
- Invalidate `['user-groups']` and `['group-directory']` caches
- Navigate to the new group detail page on success

### 8. Invalidate profile stats

When joining/leaving a group, also invalidate `['profile-stats-count', userId]` so the profile counter updates immediately.

### Summary

| Area | Files |
|------|-------|
| Routing | `App.tsx` |
| Navigation fixes | `MobileGroupsTabContent.tsx`, `ProfileGroupsTab.tsx`, + 4 other components |
| New hooks | `useGroupDirectory.ts`, `useGroupMembership.ts` |
| Directory page | `Groups.tsx` (rewrite with real data) |
| Detail page | `GroupDetail.tsx` (rewrite with real data) |
| Create flow | `CreateGroupPopup.tsx` (wire to DB) |

No database migrations needed — tables, RLS, and foreign keys already exist.

