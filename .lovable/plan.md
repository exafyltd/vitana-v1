

## Fix: "View Full Profile" Shows "User Not Found"

### Root Cause

In `ProfilePreviewDialog.tsx`, the "View Full Profile" button navigates to `/u/${profile.handle}`. The handle is set as:

```tsx
handle: dbProfile.handle || dbProfile.user_id.slice(0, 8)
```

Two problems:
1. If the user has no `handle` set in the database, the fallback is the first 8 characters of their UUID (e.g., `bc34a5ca`). This partial string doesn't match any handle or UUID pattern in the `get_user_profile_by_identifier` RPC, so the profile page shows "User Not Found".
2. Even with a valid handle, the RPC also requires a matching row in `global_community_profiles` with `is_visible = true`. If that row is missing, the profile won't load.

The preview dialog itself works fine because it queries the RPC with the full UUID directly. The problem only appears when navigating to the full profile page.

### Fix

**File: `src/components/profile/ProfilePreviewDialog.tsx`**

Change `handleViewFullProfile` to navigate using the full user_id (UUID) when no proper handle exists, instead of the truncated 8-character fallback:

```tsx
const handleViewFullProfile = () => {
  if (!profile) return;
  // Prefer handle, fall back to full user_id (UUID) for reliable lookup
  const identifier = dbProfile?.handle || profile.id;
  navigate(`/u/${identifier}`);
  closePreview();
};
```

This ensures the RPC receives either a valid handle or a full UUID, both of which it can resolve correctly.

### What Changes

One file, one function -- `handleViewFullProfile` in `ProfilePreviewDialog.tsx`. The navigation identifier falls back to the full UUID instead of a truncated 8-char string.

