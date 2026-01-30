

## Fix Social Presence Connection Status Not Displaying

### Problem Analysis

The user reports that Instagram and Facebook accounts appear as "Not linked" on the profile page despite being connected. After thorough investigation, I found **two separate issues**:

### Root Cause 1: Database Has No Social URLs

The database query confirms that **Daniela Küper has null values for all social URLs**:

```
id: 96f34f52-72d1-4475-a96c-2217b63a196e
user_id: 05ce4a1d-fb54-4c08-acd3-11c8d0a80d8b  
instagram_url: null
facebook_url: null
linkedin_url: null
```

In contrast, **Jovana Comm** (whose profile displays correctly) has populated URLs:

```
instagram_url: https://www.instagram.com/jovanataditsh?igsh=...
facebook_url: https://www.facebook.com/share/1CaVooJ3M5/
```

**Possible causes for the URLs not being saved:**
- The edge function `social-media-import` may have failed silently
- The import dialog may not have been completed successfully
- There could be an RLS policy blocking the update

### Root Cause 2: Profile.tsx Missing Social URL Fields

The `/profile` page (Profile.tsx) creates a `mockUserProfile` object that is **missing all social URL fields**:

```tsx
const mockUserProfile = {
  id: user?.id || "",
  name: profile.displayName,
  handle: profile.handle || "@user",
  avatarUrl: profile.avatar,
  // ... other fields
  // MISSING: linkedin_url, instagram_url, facebook_url, x_url, tiktok_url, youtube_url
};
```

Even though `ProfileProvider` fetches these fields (lines 93-98), they are never passed to the `ProfileIdCardBack` component.

### Solution

#### Fix 1: Update Profile.tsx to Include Social URLs

Add the social URL fields to the `mockUserProfile` object:

```tsx
const mockUserProfile = {
  id: user?.id || "",
  user_id: user?.id,  // Add user_id for edge function compatibility
  name: profile.displayName,
  handle: profile.handle || "@user",
  avatarUrl: profile.avatar,
  coverUrl: profile.coverUrl,
  // ... existing fields ...
  
  // Add social URLs from ProfileProvider context
  linkedin_url: profile.linkedin_url,
  instagram_url: profile.instagram_url,
  facebook_url: profile.facebook_url,
  x_url: profile.x_url,
  youtube_url: profile.youtube_url,
  tiktok_url: profile.tiktok_url,
};
```

#### Fix 2: Add onSuccess Handler to Desktop Component

The desktop `ProfileIdCardBack.tsx` is missing the `onSuccess` prop that triggers profile refresh after successful import. Compare:

**Mobile (correct):**
```tsx
<SocialMediaImportDialog
  ...
  onSuccess={handleImportSuccess}  // ✓ Has refresh handler
/>
```

**Desktop (missing):**
```tsx
<SocialMediaImportDialog 
  ...
  // Missing onSuccess prop!
/>
```

Add the same refresh pattern to the desktop component.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Profile.tsx` | Add social URL fields and `user_id` to `mockUserProfile` |
| `src/components/profile/shared/ProfileIdCardBack.tsx` | Add `onSuccess` handler for profile refresh after import |

### Implementation Details

**Profile.tsx (lines 59-88):**

```tsx
const mockUserProfile = {
  id: user?.id || "",
  user_id: user?.id,  // NEW: Add user_id field
  name: profile.displayName,
  handle: profile.handle || "@user",
  avatarUrl: profile.avatar,
  coverUrl: profile.coverUrl,
  roles: ["community" as const],
  membershipTier: null,
  bio: profile.bio,
  links: [],
  languages: [],
  location: "",
  stats: dummyProfileStats,
  vitanaIndex: 750,
  vitanaPercentile: 85,
  longevityArchetype: "The Mindful Mover",
  offerings: [],
  // NEW: Add social URLs from context
  linkedin_url: profile.linkedin_url,
  instagram_url: profile.instagram_url,
  facebook_url: profile.facebook_url,
  x_url: profile.x_url,
  youtube_url: profile.youtube_url,
  tiktok_url: profile.tiktok_url,
  compliance: {
    isProfessional: false,
    licenseVerified: false
  },
  visibility: {
    about: "public" as const,
    links: "public" as const,
    location: "public" as const,
    showcase: "public" as const,
    indexPublic: true,
    healthShareConsent: true
  }
};
```

**ProfileIdCardBack.tsx:**

1. Import `useProfile` hook
2. Add refresh handler
3. Pass `onSuccess` to dialog

```tsx
import { useProfile } from "@/context/ProfileProvider";

export function ProfileIdCardBack({ profile, themeConfig }: ProfileIdCardBackProps) {
  const { user } = useAuth();
  const { refreshProfile } = useProfile();  // NEW
  // ... existing code ...

  const handleImportSuccess = () => {
    refreshProfile();  // Trigger context refresh
  };

  // In the dialog JSX:
  <SocialMediaImportDialog 
    open={dialogOpen}
    onOpenChange={setDialogOpen}
    platform={selectedPlatform.platform}
    platformName={selectedPlatform.name}
    icon={selectedPlatform.icon}
    profileId={user?.id ?? profile.user_id ?? profile.id}
    onSuccess={handleImportSuccess}  // NEW
  />
}
```

### Verification Steps

1. Navigate to Profile page while logged in as Daniela
2. Go to Social Presence section (back of ID card)
3. Click "Connect" on Instagram
4. Enter a valid Instagram URL
5. Submit the import
6. Verify:
   - Toast shows "Import Successful"
   - Instagram icon immediately shows as connected (colored with checkmark)
   - No page reload required
7. Refresh page and verify the connected state persists

### Technical Summary

| Issue | Location | Root Cause | Fix |
|-------|----------|------------|-----|
| Social URLs not passed to component | Profile.tsx | `mockUserProfile` missing social URL fields | Add all 6 social URL fields from context |
| No refresh after import | ProfileIdCardBack.tsx | Missing `onSuccess` handler | Add `refreshProfile()` callback |
| Missing `user_id` field | Profile.tsx | Component can't identify correct user for updates | Add `user_id: user?.id` to profile object |

