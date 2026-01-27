

# Localize Mobile Profile Tabs + Translation Adjustments

## Summary

The mobile "Edit Profile" screen tabs are not responding to language changes because `MobileProfileTabs.tsx` uses hardcoded English strings. Additionally, the user wants:
- **"Posts"** to stay as "Posts" in German (not "Beiträge")
- **"About"** to be translated as "Über Uns" in German

## Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | Change `posts` from "Beiträge" → "Posts", add `about: "Über Uns"` |
| `src/i18n/en.json` | Add `about: "About"` |
| `src/components/profile/mobile/MobileProfileTabs.tsx` | Import `useTranslation` hook and use dynamic tab labels |

## Technical Details

### 1. German Translations (`de.json`)
```json
"profileTabs": {
  "posts": "Posts",         // Changed from "Beiträge"
  "about": "Über Uns",      // New - mobile-only tab
  "media": "Medien",
  "groups": "Gruppen",
  "events": "Events",
  "health": "Gesundheit",
  "services": "Dienste",
  "insight": "Einblick"
}
```

### 2. English Translations (`en.json`)
```json
"profileTabs": {
  "posts": "Posts",
  "about": "About",         // New - mobile-only tab
  "media": "Media",
  ...
}
```

### 3. Mobile Component Update (`MobileProfileTabs.tsx`)

Replace the hardcoded `TABS` constant with dynamic translations:

```typescript
import { useTranslation } from "@/hooks/useTranslation";

export function MobileProfileTabs({ ... }) {
  const { translate } = useTranslation();
  
  const tabs: { id: MobileProfileTab; label: string }[] = [
    { id: "posts", label: translate('profileTabs.posts', 'Posts') },
    { id: "about", label: translate('profileTabs.about', 'About') },
    { id: "media", label: translate('profileTabs.media', 'Media') },
    { id: "groups", label: translate('profileTabs.groups', 'Groups') },
  ];
  
  // ... rest of component uses `tabs` array
}
```

## Result

| Tab | German | English |
|-----|--------|---------|
| Posts | Posts | Posts |
| About | Über Uns | About |
| Media | Medien | Media |
| Groups | Gruppen | Groups |

Both mobile (Edit Profile screen) and desktop profile views will now properly respond to language selection.

