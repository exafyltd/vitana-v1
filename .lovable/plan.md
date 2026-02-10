
# Enable Posting on Mobile Profile

## Problem

The mobile profile "Posts" tab currently shows only hardcoded mock posts. There is no way to create a post, and no database table exists for profile/community posts (only `distribution_posts` for campaigns).

## Solution

Create a new `profile_posts` table and build a mobile-first post creation flow using a full-screen sheet (following the PWA architecture pattern).

## What Changes

### 1. New Database Table: `profile_posts`

Create a `profile_posts` table with columns:
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `content` (text, required)
- `image_url` (text, optional)
- `likes_count` (integer, default 0)
- `comments_count` (integer, default 0)
- `shares_count` (integer, default 0)
- `is_public` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)

Enable RLS with policies:
- Anyone can read public posts
- Authenticated users can create their own posts
- Users can update/delete their own posts

### 2. New Component: `MobileCreatePostSheet.tsx`

A full-screen bottom sheet (following the mobile sheet pattern) with:
- Textarea for post content
- Optional image attachment (using existing storage infrastructure if available, otherwise text-only initially)
- Character counter
- "Post" button that saves to `profile_posts` table
- Cancel button to dismiss

### 3. New Hook: `useProfilePosts.ts`

A React Query hook providing:
- `posts` query: fetches posts for a given user_id from `profile_posts`, ordered by `created_at` desc
- `createPost` mutation: inserts a new post
- `deletePost` mutation: deletes own post

### 4. Update Mobile Profile Posts Tab

**In `EditProfilePage.tsx`** (lines 341-351):
- Add a floating "+" button or a "Create Post" card at the top of the posts tab
- Open the `MobileCreatePostSheet` when tapped
- After the showcase header, render real posts from `useProfilePosts` instead of nothing

**In `ProfilePostsTab.tsx`**:
- Replace the mock `mockPosts` array with data from `useProfilePosts`
- Keep the existing card design but wire it to real data
- Show empty state with a "Write your first post" CTA

### 5. Translation Keys

Add to both `en.json` and `de.json`:
- `profilePosts.createPost`: "Create Post" / "Beitrag erstellen"
- `profilePosts.placeholder`: "What's on your mind?" / "Was bewegt dich?"
- `profilePosts.post`: "Post" / "Posten"
- `profilePosts.emptyTitle`: "No posts yet" / "Noch keine Beitraege"
- `profilePosts.emptyDescription`: "Share your first update with the community" / "Teile dein erstes Update mit der Community"
- `profilePosts.deleteConfirm`: "Delete this post?" / "Beitrag loeschen?"

## Files Changed

| File | Action |
|------|--------|
| SQL migration | Create `profile_posts` table + RLS |
| `src/hooks/useProfilePosts.ts` | New hook for CRUD |
| `src/components/profile/mobile/MobileCreatePostSheet.tsx` | New full-screen post creation sheet |
| `src/components/profile/shared/tabs/ProfilePostsTab.tsx` | Replace mock data with real data |
| `src/pages/EditProfilePage.tsx` | Add create post button + sheet in posts tab |
| `src/components/profile/shared/ProfileLayout.tsx` | Wire posts tab to real data in public view |
| `src/i18n/en.json` | Add translation keys |
| `src/i18n/de.json` | Add translation keys |
