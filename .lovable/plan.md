

## Problem

When viewing another user's profile, you see **your own** photos, videos, and posts instead of theirs. The root cause is a flawed user ID resolution chain.

### Root Cause

In `ProfileLayout.tsx` (line 146), the profile user ID is resolved as:

```typescript
const profileUserId = profile.user_id || user?.id || profile.id;
```

When coming from `PublicProfilePage`, the `UserProfile` object has `id` set to `dbProfile.user_id` (correct), but `user_id` is **not set** (it's not in the `UserProfile` type). So the fallback chain hits `user?.id` — the **logged-in user's ID** — before ever reaching `profile.id` (which has the correct value).

This means all hooks (`useProfileGallery`, `useProfileMilestones`, `VideoGallery`) query data for the wrong user.

The same bug exists in `ProfilePostsTab.tsx` (line 27):
```typescript
useProfilePosts(profile.user_id || user?.id)
```
Again, `profile.user_id` is undefined, so it falls back to logged-in user.

Additionally, the mobile **Posts tab** (line 236) only renders content when `effectiveEditMode` is true — visitors see nothing at all.

## Plan (3 changes, 2 files)

### 1. Fix user ID fallback order in `ProfileLayout.tsx`

Change line 146 from:
```typescript
const profileUserId = profile.user_id || user?.id || profile.id;
```
to:
```typescript
const profileUserId = profile.user_id || profile.id || user?.id;
```

This ensures `profile.id` (which `PublicProfilePage` correctly sets to the viewed user's UUID) is preferred over the logged-in user's ID.

### 2. Fix user ID fallback in `ProfilePostsTab.tsx`

Change line 27 from:
```typescript
useProfilePosts(profile.user_id || user?.id)
```
to:
```typescript
useProfilePosts(profile.user_id || profile.id)
```

And line 28 similarly:
```typescript
const isOwner = user?.id === (profile.user_id || profile.id);
```
(This line is already correct — no change needed.)

### 3. Add posts rendering for non-edit mobile view in `ProfileLayout.tsx`

The posts tab (line 236) only shows content when `effectiveEditMode` is true. Add an else branch that renders `ProfilePostsTab` for visitors and non-edit owners, passing `profileUserId` so it queries the correct user's posts.

### Files

| File | Change |
|------|--------|
| `src/components/profile/shared/ProfileLayout.tsx` | Fix `profileUserId` fallback order; add posts tab content for non-edit/visitor view |
| `src/components/profile/shared/tabs/ProfilePostsTab.tsx` | Fix `useProfilePosts` userId fallback |

