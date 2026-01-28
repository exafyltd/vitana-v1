
# Internationalization Hardening (DE/EN) — "No Hardcoded Strings" Rule

## Executive Summary

Complete i18n refactoring to ensure when German is selected, **100% of the UI displays in German** — including all 11 mobile screens, toasts, modals, validation errors, empty states, loading states, and system messages. Zero partial translation allowed.

---

## Current State Analysis

### Existing i18n Infrastructure
| Component | Status |
|-----------|--------|
| Translation files | ✅ `src/i18n/de.json` (399 lines), `src/i18n/en.json` (472 lines) |
| Translation hook | ✅ `useTranslation()` in `src/hooks/useTranslation.ts` |
| Language context | ✅ `LanguageContext` with localStorage persistence |
| Some screens localized | ✅ Wallet, BusinessHub, SocialImportDialog use translations |

### Critical Gaps Identified (187+ files with hardcoded strings)
1. **Toast messages**: 187 files use `toast({ title: "...", description: "..." })` with raw English strings
2. **Empty states**: 88+ components with "No X yet", "No X found" hardcoded
3. **Validation errors**: 203+ files with "is required", "Please enter", "Invalid" messages
4. **Button labels**: "Create", "Cancel", "Submit", "Save" scattered throughout
5. **Mobile screens**: Many have partially translated or no translation coverage
6. **Loading states**: "Loading...", "Signing out...", "Importing..." hardcoded
7. **Confirmation dialogs**: `window.confirm()` with English text

---

## Implementation Plan

### Phase 1: Create i18n Helper Utilities

Create `src/lib/i18n-helpers.ts` with type-safe toast/confirm wrappers:

```typescript
// src/lib/i18n-helpers.ts
import { toast as rawToast } from "@/hooks/use-toast";

type TranslateFn = (key: string, fallback?: string) => string;

export function createI18nToast(translate: TranslateFn) {
  return {
    success: (titleKey: string, descKey?: string, replacements?: Record<string, string>) => {
      let title = translate(titleKey, titleKey);
      let description = descKey ? translate(descKey, descKey) : undefined;
      
      // Apply replacements
      if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, value);
          if (description) description = description.replace(`{${key}}`, value);
        });
      }
      
      rawToast({ title, description });
    },
    
    error: (titleKey: string, descKey?: string, replacements?: Record<string, string>) => {
      let title = translate(titleKey, titleKey);
      let description = descKey ? translate(descKey, descKey) : undefined;
      
      if (replacements) {
        Object.entries(replacements).forEach(([key, value]) => {
          title = title.replace(`{${key}}`, value);
          if (description) description = description.replace(`{${key}}`, value);
        });
      }
      
      rawToast({ title, description, variant: "destructive" });
    },
    
    info: (titleKey: string, descKey?: string) => {
      rawToast({ 
        title: translate(titleKey, titleKey), 
        description: descKey ? translate(descKey, descKey) : undefined 
      });
    }
  };
}

export function createI18nConfirm(translate: TranslateFn) {
  return (messageKey: string, fallback?: string) => {
    return window.confirm(translate(messageKey, fallback));
  };
}
```

Create `src/hooks/useI18nNotify.ts` for easy toast access:

```typescript
import { useTranslation } from "@/hooks/useTranslation";
import { createI18nToast, createI18nConfirm } from "@/lib/i18n-helpers";
import { useMemo } from "react";

export function useI18nNotify() {
  const { translate } = useTranslation();
  
  const notify = useMemo(() => createI18nToast(translate), [translate]);
  const confirm = useMemo(() => createI18nConfirm(translate), [translate]);
  
  return { notify, confirm };
}
```

---

### Phase 2: Expand Translation Files

Add comprehensive translation keys for all UI text. Structure:

```json
{
  "toasts": {
    "success": {
      "saved": "Erfolgreich gespeichert",
      "created": "Erfolgreich erstellt",
      "deleted": "Erfolgreich gelöscht",
      "copied": "In Zwischenablage kopiert",
      "sent": "Erfolgreich gesendet",
      "uploaded": "Upload erfolgreich",
      "profileUpdated": "Profil erfolgreich aktualisiert"
    },
    "error": {
      "generic": "Etwas ist schiefgelaufen",
      "network": "Netzwerkfehler. Bitte versuchen Sie es erneut.",
      "notAuthenticated": "Bitte melden Sie sich an",
      "notAuthorized": "Keine Berechtigung für diese Aktion",
      "saveFailed": "Speichern fehlgeschlagen",
      "loadFailed": "Laden fehlgeschlagen",
      "uploadFailed": "Upload fehlgeschlagen"
    }
  },
  "validation": {
    "required": "Dieses Feld ist erforderlich",
    "invalidEmail": "Ungültige E-Mail-Adresse",
    "invalidUrl": "Ungültige URL",
    "tooShort": "Mindestens {min} Zeichen erforderlich",
    "tooLong": "Maximal {max} Zeichen erlaubt",
    "passwordMismatch": "Passwörter stimmen nicht überein"
  },
  "states": {
    "loading": "Wird geladen...",
    "saving": "Wird gespeichert...",
    "sending": "Wird gesendet...",
    "uploading": "Wird hochgeladen...",
    "processing": "Wird verarbeitet...",
    "signingOut": "Abmelden...",
    "importing": "Wird importiert..."
  },
  "empty": {
    "noData": "Keine Daten vorhanden",
    "noResults": "Keine Ergebnisse gefunden",
    "noMessages": "Keine Nachrichten",
    "noEvents": "Keine Veranstaltungen geplant",
    "noOrders": "Keine Bestellungen",
    "noRooms": "Keine Live-Räume verfügbar",
    "noGroups": "Noch keine Gruppen",
    "noMusic": "Noch keine Musik hochgeladen",
    "noPodcasts": "Noch keine Podcasts",
    "noServices": "Noch keine Dienste"
  },
  "confirm": {
    "unsavedChanges": "Sie haben ungespeicherte Änderungen. Möchten Sie wirklich verlassen?",
    "delete": "Sind Sie sicher, dass Sie dies löschen möchten?",
    "cancel": "Sind Sie sicher, dass Sie abbrechen möchten?"
  },
  "buttons": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "create": "Erstellen",
    "close": "Schließen",
    "confirm": "Bestätigen",
    "submit": "Absenden",
    "next": "Weiter",
    "back": "Zurück",
    "retry": "Erneut versuchen",
    "refresh": "Aktualisieren",
    "viewAll": "Alle anzeigen",
    "seeMore": "Mehr anzeigen",
    "learnMore": "Mehr erfahren"
  }
}
```

---

### Phase 3: Refactor 11 Mobile Screens

Each mobile screen requires translation integration:

| Screen | File Location | Key Changes |
|--------|---------------|-------------|
| 1. Events & MeetUps | `src/pages/Community.tsx` | StandardHeader, tabs, empty states |
| 2. Live Rooms | `src/pages/community/LiveRooms.tsx` | Tab labels, room cards, join button |
| 3. Media Hub | `src/pages/community/MediaHub.tsx` | Section headers, empty states |
| 4. Discover Marketplace | `src/pages/Discover.tsx` | Categories, search placeholder, cards |
| 5. Orders | `src/pages/discover/Orders.tsx` | Tabs, status labels, empty state |
| 6. Vitana Wallet | `src/pages/Wallet.tsx` | Already partially done, complete it |
| 7. Health | `src/pages/Health.tsx` | Pillar labels, action cards |
| 8. Messages (Inbox) | `src/pages/Messages.tsx` | Tabs, empty state, loading |
| 9. Edit Profile | `src/pages/EditProfilePage.tsx` | Section titles, drawer labels |
| 10. Business Hub | `src/pages/BusinessHub.tsx` | Already partially done, complete it |
| 11. Logout | `src/pages/Logout.tsx` | "Signing out..." message |

**Pattern for each screen refactor:**
```typescript
// Before
<StandardHeader title="Events & MeetUps" description="..." />

// After
const { translate } = useTranslation();
<StandardHeader 
  title={translate('events.title', 'Events & MeetUps')} 
  description={translate('events.description', '...')} 
/>
```

---

### Phase 4: Add Missing Key Detection (Dev Mode)

Create `src/lib/i18n-dev.ts`:

```typescript
const missingKeys = new Set<string>();

export function logMissingKey(key: string) {
  if (process.env.NODE_ENV === 'development' && !missingKeys.has(key)) {
    missingKeys.add(key);
    console.warn(`[i18n] Missing translation key: ${key}`);
  }
}

export function getMissingKeys() {
  return Array.from(missingKeys);
}
```

Integrate into `useTranslation.ts`:

```typescript
const translate = (key: string, fallback?: string): string => {
  const keys = key.split('.');
  let result: any = t;
  
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      // DEV: Log missing key
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n] Missing key: "${key}" - using fallback: "${fallback || key}"`);
      }
      return fallback || `[[missing:${key}]]`; // Show visual indicator in dev
    }
  }
  
  return typeof result === 'string' ? result : fallback || key;
};
```

---

### Phase 5: Refactor Common Components

Components that need translation wrappers:

| Component | File | Hardcoded Strings |
|-----------|------|-------------------|
| Empty states (5+) | `src/components/health/*EmptyState.tsx` | "No X Plan Yet", button labels |
| Toast calls | 187 files | All `toast({ title, description })` |
| LiveRoomDirectory | `src/components/community/LiveRoomDirectory.tsx` | "Live now", "Scheduled", "No rooms found" |
| MobileMusicList | `src/components/community/MobileMusicList.tsx` | "No music uploaded yet" |
| Loading spinners | Various | "Loading...", "Loading messages..." |

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/lib/i18n-helpers.ts` | Toast/confirm wrappers with translation |
| `src/hooks/useI18nNotify.ts` | Hook for translated notifications |
| `src/lib/i18n-dev.ts` | Missing key detection for dev mode |

### Translation Files (Major Expansion)
| File | Current Lines | Estimated After |
|------|---------------|-----------------|
| `src/i18n/de.json` | 399 | ~800 |
| `src/i18n/en.json` | 472 | ~800 |

### Component Refactors (~200 files)
- All toast calls → `useI18nNotify().notify.success/error()`
- All empty state text → `translate('empty.X')`
- All button labels → `translate('buttons.X')`
- All validation messages → `translate('validation.X')`
- All loading states → `translate('states.X')`

---

## Translation Key Structure

```text
├── authPage.*         # Login/signup
├── events.*           # Events & MeetUps
├── liveRooms.*        # Live Rooms
├── mediaHub.*         # Media Hub (NEW)
├── discover.*         # Discover Marketplace
├── orders.*           # Orders (NEW)
├── wallet.*           # Wallet
├── health.*           # Health
├── inbox.*            # Messages
├── profile.*          # Profile/Edit Profile
├── businessHub.*      # Business Hub
├── toasts.*           # All toast messages (NEW)
├── validation.*       # Form validation (NEW)
├── states.*           # Loading/processing states (NEW)
├── empty.*            # Empty state messages (NEW)
├── confirm.*          # Confirmation dialogs (NEW)
├── buttons.*          # Common buttons (NEW)
└── common.*           # Shared strings
```

---

## Acceptance Criteria Checklist

- [ ] All 11 mobile screens fully translated
- [ ] Zero hardcoded visible strings in UI components
- [ ] All toasts use `useI18nNotify()` helpers
- [ ] All validation messages use translation keys
- [ ] All empty/loading states translated
- [ ] All confirmation dialogs translated
- [ ] Missing keys logged clearly in development
- [ ] Language switch updates ALL visible text instantly
- [ ] Navigation through all 11 screens shows zero English when German selected

---

## Estimated Effort

| Phase | Files | Complexity |
|-------|-------|------------|
| Phase 1: Helpers | 2 new files | Low |
| Phase 2: Translation expansion | 2 files | Medium |
| Phase 3: 11 mobile screens | ~15 files | High |
| Phase 4: Dev detection | 2 files | Low |
| Phase 5: Component refactor | ~200 files | High |

**Recommended approach**: Implement in multiple prompts, tackling 2-3 screens per prompt with their associated toasts and empty states.

---

## Technical Notes

- Keep "Events & MeetUps" as English per project memory (brand identifier)
- Keep "Posts" as English in German (per user preference)
- All translations use German formal "Sie" form
- Fallback chain: German → English → Show key with `[[missing:key]]` marker
