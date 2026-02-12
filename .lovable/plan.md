

# Fix: Personality Descriptor Not Updating on Profile Display

## Problem
The personality descriptor (archetype) is hardcoded as "The Mindful Mover" in both `Profile.tsx` and `EditProfilePage.tsx`. Even though the Edit Identity form correctly saves "The Life Lover" to the database, the profile display never reads the updated value -- it always shows the hardcoded string.

## Root Cause
The `ProfileProvider` context does not fetch or expose the `longevityArchetype` field from the database. Both profile pages construct the profile object with a hardcoded value instead of using context data.

## Plan

### Step 1: Add `longevityArchetype` to ProfileProvider
- Add `longevityArchetype?: string` to the `ProfileData` interface
- Map `profileData.longevity_archetype` from the database response into the profile state (same pattern used for `bio`, `handle`, etc.)

### Step 2: Use context value in Profile.tsx
- Replace the hardcoded `longevityArchetype: "The Mindful Mover"` with `longevityArchetype: profile.longevityArchetype || ""` (where `profile` comes from `useProfile()`)

### Step 3: Use context value in EditProfilePage.tsx
- Same replacement: use `contextProfile.longevityArchetype` instead of the hardcoded string

## Files Changed

| File | Change |
|------|--------|
| `src/context/ProfileProvider.tsx` | Add `longevityArchetype` to `ProfileData` interface and map it from DB |
| `src/pages/Profile.tsx` | Replace hardcoded archetype with context value |
| `src/pages/EditProfilePage.tsx` | Replace hardcoded archetype with context value |

