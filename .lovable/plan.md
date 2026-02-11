

# Plan: Fix Manual Bio Editing to Properly Reflect on Profile

## Problem

Currently, when you manually edit your bio, location, links, and languages via the About drawer, the changes are saved to the database but **not reflected back** in the profile UI. This happens because:

1. **EditProfilePage** fetches profile data from the database but only maps `bio` and social media fields -- it ignores `location`, `links`, and `languages`.
2. **ProfileProvider** (the global context) doesn't include `location`, `links`, or `languages` in its data model, so they're never available to components.
3. **Profile.tsx** (read-only view) hardcodes empty arrays for `links`/`languages` and an empty string for `location` instead of reading from the database.
4. After saving in the **AboutDrawer**, `refreshProfile()` is called, but since ProfileProvider doesn't track these fields, nothing updates.

## Solution

### 1. Extend ProfileProvider to include bio-related fields

Add `location`, `links`, and `languages` to the `ProfileData` interface and fetch them from the database.

**File: `src/context/ProfileProvider.tsx`**
- Add `location`, `links`, `languages` to the `ProfileData` interface
- Map these fields from the database response in `fetchUserProfile`

### 2. Update EditProfilePage to load all About fields from DB

**File: `src/pages/EditProfilePage.tsx`**
- In `refetchProfile`, also map `location`, `links`, and `languages` from the database response into the local `profile` state
- Remove the hardcoded defaults for `location` ("San Francisco, CA"), `links`, and `languages` -- use empty defaults instead so real data takes precedence

### 3. Update Profile.tsx to show real data

**File: `src/pages/Profile.tsx`**
- Replace the hardcoded empty `links: []`, `languages: []`, and `location: ""` in `mockUserProfile` with values from `profile` context (which will now include these fields)

### 4. Refresh EditProfilePage after AboutDrawer saves

**File: `src/pages/EditProfilePage.tsx`**
- After the AboutDrawer closes, call `refetchProfile()` to reload the updated data so the profile view reflects the changes immediately

---

## Technical Details

### ProfileProvider changes
```
interface ProfileData {
  // ... existing fields
  location?: string;
  links?: Array<{ label: string; url: string }>;
  languages?: string[];
}
```

In `fetchUserProfile`, add:
```
location: profileData?.location || undefined,
links: profileData?.links || undefined,
languages: profileData?.languages || undefined,
```

### EditProfilePage refetchProfile addition
```
location: data.location || '',
links: data.links || [],
languages: data.languages || [],
```

And remove hardcoded initial values:
```
// Before:
location: 'San Francisco, CA',
links: [{ label: 'Website', url: '...' }, ...],
languages: ['English', 'Ukrainian'],

// After:
location: '',
links: [],
languages: [],
```

### Profile.tsx fix
```
bio: profile.bio,
location: profile.location || '',
links: profile.links || [],
languages: profile.languages || [],
```

### AboutDrawer onOpenChange callback
Wire the `refetchProfile` call when the drawer closes after save, ensuring the parent page refreshes its data.

