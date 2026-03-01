

## Problem

When you upload or replace your profile image via the Identity Drawer, the change saves to the database correctly but **does not reflect on the profile page** until you do a full page reload. Two issues:

1. **`IdentityDrawer` does not trigger a local profile refetch** -- It calls `refreshProfile()` (context-level) but `EditProfilePage` has its own local `profile` state that never re-syncs avatar/name/handle from the context after initial load.

2. **No sync effect for identity fields** -- `EditProfilePage` has a `useEffect` that syncs social URLs from `contextProfile` (lines 112-129), but avatar, name, handle, and archetype are excluded from this sync.

## Plan (2 changes)

### 1. Call `refetchProfile` when IdentityDrawer closes after save

In `EditProfilePage.tsx`, update the `IdentityDrawer` usage to call the local `refetchProfile` when the drawer closes (same pattern already used for `AboutDrawer` on line 441-444):

```tsx
<IdentityDrawer
  open={identityDrawerOpen}
  onOpenChange={(open) => {
    setIdentityDrawerOpen(open);
    if (!open) refetchProfile();
  }}
/>
```

### 2. Add identity field sync from contextProfile

In `EditProfilePage.tsx`, add a `useEffect` that syncs avatar, name, handle, and archetype from `contextProfile` — matching the existing social URL sync pattern:

```tsx
useEffect(() => {
  setProfile(prev => ({
    ...prev,
    avatarUrl: contextProfile.avatar || prev.avatarUrl,
    name: contextProfile.displayName || prev.name,
    handle: contextProfile.handle || prev.handle,
    longevityArchetype: contextProfile.longevityArchetype || prev.longevityArchetype,
  }));
}, [contextProfile.avatar, contextProfile.displayName, contextProfile.handle, contextProfile.longevityArchetype]);
```

### Files to change

| File | Change |
|------|--------|
| `src/pages/EditProfilePage.tsx` | Add `refetchProfile` call on IdentityDrawer close + add identity sync useEffect |

