

# Fix Default Bio Not Updating to German

## Problem

The default bio placeholder stays in English ("Wellness enthusiast passionate about holistic health and community building.") even when German is selected. This happens because:

1. `useState` only uses its initial value once at component mount
2. If the language context isn't ready during initial render, or changes later, the bio stays at the English fallback

## Root Cause

```typescript
// Line 46-55 in EditProfilePage.tsx
const defaultBio = translate('profile.defaultBio', 'Wellness enthusiast...');

const [profile, setProfile] = useState<UserProfile>({
  ...
  bio: defaultBio,  // Only set once on mount!
  ...
});
```

The translation might not be ready when the component first mounts, causing it to use the English fallback forever.

## Solution

Add a `useEffect` that watches for language changes and updates the bio **only if** it matches one of the known default placeholder texts. This ensures:
- User-entered custom bios are never overwritten
- Default placeholder updates when language changes

## Implementation

### Update EditProfilePage.tsx

Add an effect after the existing state initialization:

```typescript
// Define both default bio texts for comparison
const DEFAULT_BIO_EN = 'Wellness enthusiast passionate about holistic health and community building. 🌱';
const DEFAULT_BIO_DE = 'Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱';

// Get localized default bio
const localizedDefaultBio = translate('profile.defaultBio', DEFAULT_BIO_EN);

// Sync default bio when language changes
useEffect(() => {
  setProfile(prev => {
    // Only update if current bio is one of the default placeholders
    const isDefaultBio = prev.bio === DEFAULT_BIO_EN || prev.bio === DEFAULT_BIO_DE;
    if (isDefaultBio && prev.bio !== localizedDefaultBio) {
      return { ...prev, bio: localizedDefaultBio };
    }
    return prev;
  });
}, [localizedDefaultBio]);
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/EditProfilePage.tsx` | Add constants for default bios + useEffect to sync on language change |

## Expected Result

- When German is selected: "Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau."
- When English is selected: "Wellness enthusiast passionate about holistic health and community building."
- Custom user bios remain unchanged regardless of language selection

## Acceptance Criteria

- [ ] Default bio shows German text when German is selected
- [ ] Default bio shows English text when English is selected
- [ ] Switching language updates the default bio immediately
- [ ] User's custom bio (if set) is never overwritten

