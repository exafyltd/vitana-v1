

## Fix: Video Gallery Not Showing on Mobile

### Root Cause

The `profile.id` in `EditProfilePage.tsx` is hardcoded to `'current-user'` (line 63), not the actual user UUID. When `VideoGallery` receives `userId="current-user"`:

1. `isOwner` becomes `false` because `user.id` (a real UUID) does not equal `"current-user"`
2. Since there are no videos yet AND `isOwner` is false, line 71 returns `null` -- hiding the entire component

### Fix

**File: `src/pages/EditProfilePage.tsx` (line 423)**

Change the `VideoGallery` prop from `profile.id` to `user?.id` (the actual auth UUID), same as how `PhotoGallery` already uses `user.id` via `useProfileGallery`:

```tsx
// Before
<VideoGallery userId={profile.id} />

// After
<VideoGallery userId={user?.id} />
```

This single-line fix ensures:
- `isOwner` correctly resolves to `true`
- The empty-state UI with "Upload Video" button renders
- Video queries use the correct UUID to fetch from `media_uploads`

### Also fix in ProfileLayout.tsx

Check if the same issue exists in the visitor-view profile layout and apply the same fix if needed -- pass the actual user UUID rather than a potentially incorrect `profile.id`.

