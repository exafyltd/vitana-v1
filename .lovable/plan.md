
# Localize Profile Stats Labels and Default Bio Placeholder

## Problem Summary

Two issues on the mobile profile view when German is selected:

1. **Stats bar labels** - Shows "89 Media" and "12 Groups" instead of "89 Medien" and "12 Gruppen"
2. **Default bio placeholder** - Shows English placeholder "Wellness enthusiast passionate about holistic health and community building." when user has no bio set

---

## Root Cause

| Issue | File | Cause |
|-------|------|-------|
| Stats labels | `MobileProfileStats.tsx` (lines 27, 30, 33) | Hardcoded "Posts", "Media", "Groups" |
| Stats labels | `ProfileStats.tsx` (lines 17, 23, 29, 35, 41) | Hardcoded labels for all 5 stats |
| Default bio | `EditProfilePage.tsx` (line 53) | English placeholder in initial state |

---

## Solution

### Translation Keys Already Available

The translations exist at `profileTabs.*`:

| Key | German | English |
|-----|--------|---------|
| `profileTabs.posts` | Posts | Posts |
| `profileTabs.media` | Medien | Media |
| `profileTabs.groups` | Gruppen | Groups |

### New Keys Needed

| Key | German | English |
|-----|--------|---------|
| `profileStats.followers` | Follower | Followers |
| `profileStats.following` | Folge ich | Following |
| `profile.defaultBio` | Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱 | Wellness enthusiast passionate about holistic health and community building. 🌱 |

---

## Implementation Plan

### Step 1: Add Missing Translation Keys

Add to both `de.json` and `en.json`:

```json
"profileStats": {
  "followers": "Follower",      // DE: "Follower"
  "following": "Folge ich"      // DE: "Folge ich"
},
"profile": {
  "defaultBio": "..."           // Localized placeholder bio
}
```

### Step 2: Update MobileProfileStats.tsx

Import `useTranslation` and replace hardcoded strings:

```typescript
import { useTranslation } from "@/hooks/useTranslation";

export function MobileProfileStats(...) {
  const { translate } = useTranslation();
  
  return (
    <p>
      <span>{formatCount(postsCount)}</span>
      <span> {translate('profileTabs.posts', 'Posts')}</span>
      <span className="mx-1.5">·</span>
      <span>{formatCount(mediaCount)}</span>
      <span> {translate('profileTabs.media', 'Media')}</span>
      <span className="mx-1.5">·</span>
      <span>{formatCount(groupsCount)}</span>
      <span> {translate('profileTabs.groups', 'Groups')}</span>
    </p>
  );
}
```

### Step 3: Update ProfileStats.tsx (Desktop)

Apply same pattern for all 5 stats:
- Posts → `translate('profileTabs.posts', 'Posts')`
- Followers → `translate('profileStats.followers', 'Followers')`
- Following → `translate('profileStats.following', 'Following')`
- Media → `translate('profileTabs.media', 'Media')`
- Groups → `translate('profileTabs.groups', 'Groups')`

### Step 4: Update EditProfilePage.tsx Default Bio

The default bio in the initial state (line 53) should use a translation:

```typescript
// Instead of hardcoded English:
bio: 'Wellness enthusiast passionate about holistic health and community building. 🌱',

// Use a dynamic approach - the component needs to set it based on language
// Or use the translate function when initializing
```

Since `useState` runs before hooks, we'll update the bio in the `useEffect` if it matches the default English text.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | Add `profileStats.followers`, `profileStats.following`, `profile.defaultBio` |
| `src/i18n/en.json` | Add same keys with English values |
| `src/components/profile/mobile/MobileProfileStats.tsx` | Use `useTranslation` for labels |
| `src/components/profile/shared/ProfileStats.tsx` | Use `useTranslation` for all 5 labels |
| `src/pages/EditProfilePage.tsx` | Use localized default bio placeholder |

---

## Expected Result

**When German is selected:**
- Stats bar: "124 Posts · 89 Medien · 12 Gruppen"
- Desktop stats: "Posts", "Follower", "Folge ich", "Medien", "Gruppen"
- Default bio: "Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱"

**When English is selected:**
- Stats bar: "124 Posts · 89 Media · 12 Groups"
- Desktop stats: "Posts", "Followers", "Following", "Media", "Groups"
- Default bio: "Wellness enthusiast passionate about holistic health and community building. 🌱"

---

## Acceptance Criteria

- [ ] Mobile stats shows "Medien" and "Gruppen" when German is selected
- [ ] Desktop stats shows German labels for all 5 stats
- [ ] "Posts" remains "Posts" in German (per project requirement)
- [ ] Default bio placeholder shows German text when German is selected
- [ ] All labels show English when English is selected
