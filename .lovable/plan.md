
# Translate Search Placeholders in ExpandableSearchButton

## Problem

When clicking "Suchen" (Search) on the Events & Meetups page with German selected, the expanded search input shows the English placeholder "Search events and meetups..." instead of German. This pattern affects **124 files** across the application where hardcoded English placeholders are passed to `ExpandableSearchButton`.

## Root Cause

The `ExpandableSearchButton` component correctly uses `translate()` for its button label and default placeholder, but parent components override this by passing hardcoded English strings via the `placeholder` prop:

```typescript
// EventsAndMeetups.tsx line 685
<ExpandableSearchButton 
  placeholder="Search events and meetups..."  // ← Hardcoded English
  onSearch={(query) => setSearchQuery(query)}
/>
```

---

## Solution

### Phase 1: Add Context-Specific Search Placeholder Keys

Add new translation keys for each page's search placeholder:

**German (`de.json`):**
```json
{
  "events": {
    "searchPlaceholder": "Events und Meetups suchen..."
  },
  "groups": {
    "searchPlaceholder": "Gruppen suchen..."
  },
  "challenges": {
    "searchPlaceholder": "Challenges suchen..."
  },
  "settings": {
    "searchPlaceholder": "Einstellungen, Datenschutz, Integrationen suchen..."
  },
  "consent": {
    "searchPlaceholder": "Einwilligungspakete, Organisationen, Berechtigungen suchen..."
  },
  "timeline": {
    "searchPlaceholder": "Aktivität suchen..."
  },
  "wellnessServices": {
    "searchPlaceholder": "Services, Anbieter oder Programme suchen..."
  },
  "archives": {
    "searchPlaceholder": "Archive suchen..."
  }
}
```

**English (`en.json`):**
```json
{
  "events": {
    "searchPlaceholder": "Search events and meetups..."
  },
  "groups": {
    "searchPlaceholder": "Search groups..."
  },
  "challenges": {
    "searchPlaceholder": "Search challenges..."
  },
  "settings": {
    "searchPlaceholder": "Search settings, privacy controls, integrations..."
  },
  "consent": {
    "searchPlaceholder": "Search consent packages, organizations, permissions..."
  },
  "timeline": {
    "searchPlaceholder": "Search activity..."
  },
  "wellnessServices": {
    "searchPlaceholder": "Search services, providers, or programs..."
  },
  "archives": {
    "searchPlaceholder": "Search archives..."
  }
}
```

### Phase 2: Update Components to Use Translation Keys

**EventsAndMeetups.tsx (line 684-687):**
```typescript
// Before
<ExpandableSearchButton 
  placeholder="Search events and meetups..." 
  onSearch={(query) => setSearchQuery(query)}
/>

// After
<ExpandableSearchButton 
  placeholder={translate('events.searchPlaceholder', 'Search events and meetups...')} 
  onSearch={(query) => setSearchQuery(query)}
/>
```

**Groups.tsx (line 44-47):**
```typescript
// Before
<ExpandableSearchButton 
  placeholder="Search groups..." 
  onSearch={(query) => console.log('Search Groups:', query)}
/>

// After
<ExpandableSearchButton 
  placeholder={translate('groups.searchPlaceholder', 'Search groups...')} 
  onSearch={(query) => console.log('Search Groups:', query)}
/>
```

Similar updates for:
- `Challenges.tsx`
- `Settings.tsx`
- `Consent.tsx`
- `Timeline.tsx`
- `WellnessServices.tsx`
- `Archived.tsx`

---

## Files to Modify

### Translation Files
| File | Changes |
|------|---------|
| `src/i18n/de.json` | Add ~8 new `searchPlaceholder` keys |
| `src/i18n/en.json` | Add ~8 new `searchPlaceholder` keys |

### Component Files (Priority - User-Facing Pages)
| File | Change |
|------|--------|
| `src/pages/community/EventsAndMeetups.tsx` | Use `translate('events.searchPlaceholder')` |
| `src/pages/community/Groups.tsx` | Use `translate('groups.searchPlaceholder')` |
| `src/pages/community/Challenges.tsx` | Use `translate('challenges.searchPlaceholder')` |
| `src/pages/Settings.tsx` | Use `translate('settings.searchPlaceholder')` |
| `src/pages/sharing/Consent.tsx` | Use `translate('consent.searchPlaceholder')` |
| `src/pages/memory/Timeline.tsx` | Use `translate('timeline.searchPlaceholder')` |
| `src/pages/health/WellnessServices.tsx` | Use `translate('wellnessServices.searchPlaceholder')` |
| `src/pages/messages/Archived.tsx` | Use `translate('archives.searchPlaceholder')` |

---

## Acceptance Criteria

- [ ] Events & MeetUps search placeholder shows "Events und Meetups suchen..." in German
- [ ] Groups search placeholder shows "Gruppen suchen..." in German
- [ ] All other updated pages show German search placeholders when German is selected
- [ ] All pages continue to show English placeholders when English is selected
- [ ] No hardcoded English strings remain in the priority files
