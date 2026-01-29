
# Fix Mobile Social Presence Connection Status Not Updating

## Problem Summary

When users connect social networks (Instagram, Facebook, etc.) via the mobile "Social Presence" card, the connections are successfully saved to the database, but the UI remains stuck showing all platforms as unconnected (gray icons) instead of showing the connected state (colored icons with green checkmarks).

**Evidence from screenshots:**
- Screenshot 1 & 3: All icons show gray/unconnected with "Keine Social-Accounts verbunden"
- Screenshot 2: Edit form shows Instagram and Facebook URLs were entered
- Screenshot 4: Shows the CORRECT expected behavior with connected platforms highlighted

---

## Root Cause Analysis

The issue stems from **inadequate state synchronization** after a successful social import:

1. **`SocialMediaImportDialog`** successfully saves data to Supabase via edge function
2. After success, it calls `window.location.reload()` with a 1-second delay (line 122)
3. **`EditProfilePage`** maintains a **local `profile` state** that is initialized without social URL fields
4. The `useEffect` that fetches fresh profile data depends on `[user, contextProfile]`
5. After page reload, there's a **race condition** where the component may render before the async fetch completes

**Key code issues:**

```typescript
// SocialMediaImportDialog.tsx - line 122
setTimeout(() => window.location.reload(), 1000);  // Problematic approach
```

```typescript
// EditProfilePage.tsx - lines 46-78
const [profile, setProfile] = useState<UserProfile>({
  // Initial state has NO social URL fields
  // linkedin_url, instagram_url, etc. are undefined
});
```

Other drawers (IdentityDrawer, AboutDrawer) correctly use `refreshProfile()` from `useProfile()` context, but `SocialMediaImportDialog` does not.

---

## Solution

### Approach

Replace the `window.location.reload()` hack with proper state management:

1. Add an `onSuccess` callback prop to `SocialMediaImportDialog`
2. After successful import, call the callback to trigger data refresh
3. In `MobileIdCardBack`, add a refetch mechanism after dialog closes successfully
4. Use the ProfileProvider's `refreshProfile()` for context-level updates
5. Add a direct refetch of profile data in `EditProfilePage` for local state

---

## Implementation Plan

### Step 1: Update SocialMediaImportDialog

Add `onSuccess` callback prop and call it instead of page reload:

| Change | Description |
|--------|-------------|
| Add `onSuccess?: () => void` prop | Optional callback for successful import |
| Remove `window.location.reload()` | Replace with `onSuccess?.()` call |

### Step 2: Update MobileIdCardBack

Pass a refetch callback to the dialog and refresh profile data after success:

| Change | Description |
|--------|-------------|
| Use `useProfile()` hook | Access `refreshProfile` function |
| Create `handleImportSuccess` handler | Calls `refreshProfile()` and signals parent to refetch |
| Pass callback to dialog | Wire up the success handler |

### Step 3: Update EditProfilePage

Add a mechanism to refetch local profile state when social import succeeds:

| Change | Description |
|--------|-------------|
| Create `refetchProfile` function | Extracts the fetch logic from useEffect |
| Pass refetch to `MobileIdCardSwitcher` | Allow child components to trigger refresh |
| Update `MobileIdCardSwitcher` props | Add `onRefreshProfile` prop |

### Step 4: Wire Up State Refresh Chain

The data flow after successful import:

```text
SocialMediaImportDialog (success)
    └─> calls onSuccess callback
        └─> MobileIdCardBack
            └─> calls refreshProfile() (context)
            └─> calls onRefreshProfile() (parent refetch)
                └─> EditProfilePage
                    └─> refetches from Supabase
                    └─> updates local profile state
                    └─> MobileIdCardBack re-renders with new data
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/profile/dialogs/SocialMediaImportDialog.tsx` | Add `onSuccess` prop, replace reload with callback |
| `src/components/profile/mobile/MobileIdCardBack.tsx` | Add useProfile hook, create success handler, wire up callback |
| `src/components/profile/mobile/MobileIdCardSwitcher.tsx` | Pass through `onRefreshProfile` prop |
| `src/pages/EditProfilePage.tsx` | Extract refetch function, pass to MobileIdCardSwitcher |
| `src/components/profile/shared/ProfileLayout.tsx` | Pass through `onRefreshProfile` prop for mobile path |

---

## Technical Details

### SocialMediaImportDialog Changes

```typescript
interface SocialMediaImportDialogProps {
  // ... existing props
  onSuccess?: () => void;  // NEW
}

// In handleImport, replace:
// setTimeout(() => window.location.reload(), 1000);

// With:
onOpenChange(false);
onSuccess?.();  // Trigger parent refresh
```

### MobileIdCardBack Changes

```typescript
interface MobileIdCardBackProps {
  profile: UserProfile;
  editMode?: boolean;
  onEdit?: () => void;
  onRefreshProfile?: () => void;  // NEW
  className?: string;
}

// Inside component:
const { refreshProfile } = useProfile();

const handleImportSuccess = () => {
  refreshProfile();  // Update context
  onRefreshProfile?.();  // Trigger parent refetch
};

// Pass to dialog:
<SocialMediaImportDialog
  // ... existing props
  onSuccess={handleImportSuccess}
/>
```

### EditProfilePage Changes

```typescript
// Extract fetch logic into reusable function
const refetchProfile = useCallback(async () => {
  if (!user?.id) return;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (data) {
    setProfile(prev => ({ ...prev, /* map fields */ }));
  }
}, [user?.id]);

// Use in useEffect
useEffect(() => {
  refetchProfile();
}, [user, contextProfile, refetchProfile]);

// Pass to MobileIdCardSwitcher
<MobileIdCardSwitcher
  profile={profile}
  editMode={true}
  onEditIdentity={handleEditIdentity}
  onEditSocial={handleEditAbout}
  onRefreshProfile={refetchProfile}  // NEW
/>
```

---

## Acceptance Criteria

- [ ] After connecting a social network on mobile, the icon immediately shows as connected (colored with green checkmark)
- [ ] No page reload occurs after successful import
- [ ] Toast notification still displays success message
- [ ] Connected platforms grid displays correctly
- [ ] Unconnected platforms row shows remaining platforms
- [ ] Works correctly for all 6 platforms (LinkedIn, Instagram, X, TikTok, YouTube, Facebook)
- [ ] Desktop behavior remains unchanged
- [ ] Existing real-time subscription in ProfileProvider continues to work

---

## Testing Steps

1. Open the app on mobile (or mobile view)
2. Navigate to Edit Profile
3. Switch to "Social" tab
4. Tap an unconnected platform icon (e.g., Instagram)
5. Enter a valid profile URL
6. Tap "Import Profile"
7. **Verify**: Platform should immediately appear in connected grid with colored icon and green checkmark
8. **Verify**: No page reload should occur
9. **Verify**: Other connected platforms remain visible
