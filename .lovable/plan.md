
# Fix Default Bio Not Localizing After Database Fetch

## Problem Summary

The default bio placeholder shows in English even when German is selected. The screenshot shows:
- "Über" (German header) ✅
- "Tippen zum Bearbeiten" (German tap text) ✅  
- "Wellness enthusiast passionate about holistic health and community building." (English bio) ❌

## Root Cause

The bio localization logic has a **timing issue**:

1. Component mounts with `localizedDefaultBio` set to German
2. The sync `useEffect` runs but bio is already German → no change needed
3. `refetchProfile()` fetches data from database
4. Line 119 sets `bio: data.bio || prev.bio` → overwrites with English bio from database
5. The sync `useEffect` doesn't trigger again (its dependency `localizedDefaultBio` didn't change)

The database has the English default bio stored, and `refetchProfile` blindly uses it without checking if it should be localized.

---

## Solution

Modify `refetchProfile` to localize the bio if the fetched value matches one of the known default placeholder texts.

---

## Implementation

### Update refetchProfile in EditProfilePage.tsx

Add localization check when setting the bio from database:

```typescript
// In refetchProfile function, change line 119 from:
bio: data.bio || prev.bio,

// To:
bio: (() => {
  const fetchedBio = data.bio || prev.bio;
  // If fetched bio is a default placeholder, use localized version
  if (fetchedBio === DEFAULT_BIO_EN || fetchedBio === DEFAULT_BIO_DE) {
    return localizedDefaultBio;
  }
  return fetchedBio;
})(),
```

### Move Constants Outside Component

Move `DEFAULT_BIO_EN` and `DEFAULT_BIO_DE` outside the component so they're stable and can be used in the `useCallback`:

```typescript
// Before component definition
const DEFAULT_BIO_EN = 'Wellness enthusiast passionate about holistic health and community building. 🌱';
const DEFAULT_BIO_DE = 'Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱';

export default function EditProfilePage() {
  // ... rest of component
}
```

### Update useCallback Dependencies

Add `localizedDefaultBio` to the `refetchProfile` dependencies:

```typescript
const refetchProfile = useCallback(async () => {
  // ... existing logic with bio localization
}, [user?.id, contextProfile, localizedDefaultBio]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/EditProfilePage.tsx` | Move constants outside component, add bio localization in refetchProfile |

---

## Technical Flow After Fix

```text
1. Component mounts
2. localizedDefaultBio = German translation
3. refetchProfile() runs
4. Fetches data.bio from database (English)
5. Checks: Is data.bio a default placeholder?
   - YES → Use localizedDefaultBio (German)
   - NO → Use user's custom bio
6. Bio displays in German ✅
```

---

## Expected Result

When German is selected and viewing the profile:
- "Über" (About header) ✅
- "Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱" ✅
- "Tippen zum Bearbeiten" ✅

---

## Acceptance Criteria

- [ ] Default bio shows German text when German is selected
- [ ] Default bio shows English text when English is selected
- [ ] User's custom bio (if different from defaults) is never overwritten
- [ ] Works correctly after page refresh
- [ ] Works correctly after publishing updates
