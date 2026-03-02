

## Problem

The previous fix corrected `ProfileLayout.tsx` (mobile) but missed `ProfileSplitNavigation.tsx` (desktop). Line 60 still has the wrong fallback order:

```typescript
const profileUserId = profile.user_id || user?.id || profile.id;
```

When `profile.user_id` is undefined (as it is for public profiles), this falls back to `user?.id` (the logged-in viewer), so all media queries on desktop fetch the viewer's own photos and videos.

## Fix

**File: `src/components/profile/shared/ProfileSplitNavigation.tsx`** (line 60)

Change:
```typescript
const profileUserId = profile.user_id || user?.id || profile.id;
```
to:
```typescript
const profileUserId = profile.user_id || profile.id || user?.id;
```

This is the same one-line fix applied to `ProfileLayout.tsx` previously -- just missed in this parallel component.

