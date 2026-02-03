

## Fix Mobile Social Presence Synchronization

### Problem Summary
On the mobile profile page (`/me/profile`), the "Social Presence" section shows no connected accounts even though the desktop shows them correctly. The user "Jovana Comm" has LinkedIn, Instagram, and Facebook connected in the database, but mobile displays "No social accounts connected."

---

### Root Cause

The `EditProfilePage.tsx` initializes local `profile` state **without** social URLs from `ProfileProvider`, even though those URLs are available. Only after a Supabase refetch do the social URLs get populated - but by then the initial render has already passed the incomplete profile to `MobileIdCardSwitcher`.

**Desktop Profile.tsx (works)**:
```typescript
const mockUserProfile = {
  // ...
  linkedin_url: profile.linkedin_url,  // ✅ Uses ProfileProvider
  instagram_url: profile.instagram_url,
  // ...
};
```

**Mobile EditProfilePage.tsx (broken)**:
```typescript
const [profile, setProfile] = useState<UserProfile>({
  id: 'current-user',
  // ...
  // ❌ NO social URLs from contextProfile
});
```

---

### Solution

#### 1. Update `EditProfilePage.tsx` Initial State
Add social URLs from `contextProfile` to the initial `useState` call:

```typescript
const [profile, setProfile] = useState<UserProfile>({
  id: 'current-user',
  user_id: user?.id,
  name: contextProfile.displayName,
  handle: contextProfile.handle || 'user',
  avatarUrl: contextProfile.avatar,
  roles: ['community'],
  bio: localizedDefaultBio,
  location: 'San Francisco, CA',
  // ... existing fields ...
  
  // ADD: Social URLs from context for immediate display
  linkedin_url: contextProfile.linkedin_url,
  instagram_url: contextProfile.instagram_url,
  facebook_url: contextProfile.facebook_url,
  x_url: contextProfile.x_url,
  youtube_url: contextProfile.youtube_url,
  tiktok_url: contextProfile.tiktok_url,
  
  visibility: { /* ... */ }
});
```

#### 2. Update the `useEffect` to sync social URLs when `contextProfile` changes
Since `contextProfile` has realtime subscriptions, we need to sync the local state when it updates:

```typescript
// Add effect to sync social URLs when contextProfile updates
useEffect(() => {
  setProfile(prev => ({
    ...prev,
    linkedin_url: contextProfile.linkedin_url,
    instagram_url: contextProfile.instagram_url,
    facebook_url: contextProfile.facebook_url,
    x_url: contextProfile.x_url,
    youtube_url: contextProfile.youtube_url,
    tiktok_url: contextProfile.tiktok_url,
  }));
}, [
  contextProfile.linkedin_url,
  contextProfile.instagram_url,
  contextProfile.facebook_url,
  contextProfile.x_url,
  contextProfile.youtube_url,
  contextProfile.tiktok_url
]);
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/EditProfilePage.tsx` | Add social URLs to initial state + sync effect |

---

### Expected Result

1. **Immediate display**: When user navigates to `/me/profile` on mobile, connected social platforms show immediately (colored icons with checkmarks)
2. **Live sync**: When user connects a new platform, the UI updates instantly without requiring page refresh
3. **Desktop parity**: Mobile now behaves identically to desktop Social Presence section

---

### Technical Notes

- The `ProfileProvider` already has realtime subscription for profile changes (line 130-145 in `ProfileProvider.tsx`)
- After `SocialMediaImportDialog` succeeds, it calls `onSuccess` → `handleImportSuccess` → `refreshProfile()` which triggers the realtime subscription
- The new sync effect will pick up changes from `contextProfile` and update local state

