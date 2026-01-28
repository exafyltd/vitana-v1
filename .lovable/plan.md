
# Global i18n Completion — Translate ALL Helper/Description Microcopy

## Executive Summary

This plan ensures **100% German localization** across the entire application by systematically eliminating all hardcoded English strings. When German is selected, every visible system text—including helper text, descriptions, empty states, toasts, dialogs, validation errors, and permission prompts—will display in German.

---

## Current State Analysis

### Existing Infrastructure ✅
| Component | Status |
|-----------|--------|
| Translation files | `de.json` (896 lines), `en.json` (896 lines) |
| Translation hook | `useTranslation()` with missing key detection |
| I18n helpers | `useI18nNotify()`, `createI18nToast()`, `createI18nConfirm()` |
| Dev mode detection | Console warnings + `[[missing:key]]` visual indicator |

### Critical Gaps Identified

#### 1. Page-Level Descriptions (200+ files)
Files with hardcoded `description="..."` in StandardHeader, SEO components:
- `src/pages/Sharing.tsx`: "Distribute your content..."
- `src/pages/Health.tsx`: "Your comprehensive health dashboard..."
- `src/pages/community/Meetups.tsx`: "Join local wellness events..."
- `src/pages/settings/Support.tsx`: "We're here to help..."
- `src/pages/discover/Supplements.tsx`: "Premium longevity supplements..."
- And 195+ more files

#### 2. Hardcoded Confirmation Dialogs (4+ files)
```typescript
// src/pages/EditProfilePage.tsx line 191
window.confirm('You have unsaved changes. Are you sure you want to leave?')

// src/components/dev/OpenTasksList.tsx line 156
confirm("Are you sure you want to cancel this task?")

// src/components/memory/HistoryMasterActionPopup.tsx line 86
confirm("Are you sure you want to clear history older than 90 days?")

// src/components/business/PackageCard.tsx line 77
confirm('Are you sure you want to delete this package?')
```

#### 3. Empty State Components (33+ files)
```typescript
// Hardcoded "No X found" patterns:
"No groups found"
"No transactions found"
"No events found"
"No results found"
"No reports found"
"No contacts found matching..."
```

#### 4. Loading State Strings (5+ files)
```typescript
"Loading..."  // Multiple wallet/balance components
"Loading messages..."
```

#### 5. Privacy/Consent Dialogs (3+ files)
```typescript
// src/components/contacts/ContactConsentCard.tsx
"Your privacy is protected"
"We never message automatically"
"Contacts are hashed locally"
"Not now" / "Continue"

// src/components/ui/health-consent-gate.tsx
"Data Access Consent Required"
"You can revoke this consent at any time"
"Cancel" / "I Consent"
```

#### 6. Audio/Status Messages (1 file)
```typescript
// src/components/audio/AudioStatusText.tsx
"I'm listening..."
"One moment..."
"Connection issue. Please try again."
```

#### 7. Toast Messages with Hardcoded Strings (9+ files)
```typescript
toast({ title: "Error", description: "..." })
toast({ title: "Success", description: "..." })
toast({ title: "Already processed", description: "..." })
```

#### 8. Card/Action Descriptions (27+ files)
CardDescription components with hardcoded English text in popups and action cards.

---

## Implementation Plan

### Phase 1: Expand Translation Files

Add new translation keys for all discovered gaps:

**New keys for `de.json` and `en.json`:**

```json
{
  "pages": {
    "sharing": {
      "title": "Verteilung & Teilen",
      "description": "Teilen Sie Ihre Inhalte über mehrere Kanäle"
    },
    "health": {
      "overviewCard": {
        "title": "Übersicht",
        "description": "Ihr umfassendes Gesundheits-Dashboard"
      },
      "servicesHubCard": {
        "title": "Service-Hub",
        "description": "Ärzte, Coaching, Programme buchen"
      }
    },
    "meetups": {
      "title": "Wellness-Treffen",
      "description": "Lokale Wellness-Events zu den fünf Gesundheitssäulen"
    },
    "support": {
      "title": "Support-Center",
      "description": "Wir helfen Ihnen gerne weiter"
    }
  },
  "consent": {
    "privacy": {
      "title": "Ihre Privatsphäre ist geschützt",
      "subtitle": "So gehen wir mit Ihren Kontakten um",
      "neverAutoMessage": "Wir senden niemals automatisch Nachrichten",
      "neverAutoMessageDesc": "Sie entscheiden, wen und wann Sie kontaktieren",
      "hashedLocally": "Kontakte werden lokal verschlüsselt",
      "hashedLocallyDesc": "Wir verwenden nur verschlüsselte Kennungen",
      "youChoose": "Sie wählen, wen Sie einladen",
      "youChooseDesc": "Volle Kontrolle über jede Einladung",
      "helperText": "Übereinstimmungen werden aus verschlüsselten Kontaktdaten generiert. Ihre Rohdaten verlassen niemals Ihr Gerät.",
      "notNow": "Nicht jetzt",
      "continue": "Fortfahren"
    },
    "dataAccess": {
      "title": "Datenzugriff-Einwilligung erforderlich",
      "description": "Sie sind dabei, {action}. Diese Aktion erfordert Ihre ausdrückliche Zustimmung.",
      "gdprNotice": "Ihre persönlichen Daten sind durch Datenschutzvorschriften (DSGVO, HIPAA, PDPA) geschützt.",
      "revokeAnytime": "Sie können diese Einwilligung jederzeit widerrufen",
      "loggedForSecurity": "Diese Einwilligung wird für Ihre Sicherheit protokolliert",
      "recipientsComply": "Empfänger müssen die Datenschutzvorschriften einhalten",
      "iConsent": "Ich stimme zu"
    }
  },
  "audio": {
    "listening": "Ich höre zu...",
    "processing": "Einen Moment...",
    "connectionError": "Verbindungsproblem. Bitte erneut versuchen."
  },
  "smartSuggestions": {
    "bookAnnualPhysical": "Jährliche Untersuchung buchen",
    "bookAnnualPhysicalDesc": "Ihre letzte Untersuchung war vor 8 Monaten.",
    "sleepScoreDown": "Schlafqualität sinkt",
    "sleepScoreDownDesc": "Ihre Schlafqualität ist diese Woche um 12% gesunken.",
    "nutritionMatch": "Ernährungs-Community gefunden",
    "nutritionMatchDesc": "Treten Sie der Mittelmeerdiät-Gruppe bei.",
    "bookNow": "Jetzt buchen",
    "getHelp": "Hilfe holen",
    "joinGroup": "Gruppe beitreten"
  }
}
```

### Phase 2: Refactor Confirmation Dialogs

Replace all `window.confirm()` with translated confirm helper:

**Pattern:**
```typescript
// Before
const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');

// After
import { useI18nNotify } from "@/hooks/useI18nNotify";
const { confirm } = useI18nNotify();
const confirmed = confirm('confirm.unsavedChanges');
```

**Files to update:**
| File | Current String | Translation Key |
|------|----------------|-----------------|
| `EditProfilePage.tsx` | "You have unsaved changes..." | `confirm.unsavedChanges` |
| `OpenTasksList.tsx` | "Are you sure you want to cancel...?" | `confirm.cancelTask` |
| `HistoryMasterActionPopup.tsx` | "Are you sure you want to clear...?" | `confirm.clearHistory` |
| `PackageCard.tsx` | "Are you sure you want to delete...?" | `confirm.delete` |

### Phase 3: Refactor Loading States

**Pattern:**
```typescript
// Before
<p>Loading...</p>

// After
const { translate } = useTranslation();
<p>{translate('states.loading', 'Loading...')}</p>
```

**Files to update:**
- `src/pages/wallet/Balance.tsx`
- `src/pages/Wallet.tsx`
- `src/pages/admin/Bootstrap.tsx`
- `src/pages/admin/TenantManagement.tsx`
- `src/components/memory/MemoryTimelineTab.tsx`

### Phase 4: Refactor Privacy/Consent Components

**ContactConsentCard.tsx:**
```typescript
const { translate } = useTranslation();

const privacyBullets = [
  {
    icon: Lock,
    title: translate('consent.privacy.neverAutoMessage'),
    description: translate('consent.privacy.neverAutoMessageDesc'),
  },
  // ...
];

<h3>{translate('consent.privacy.title')}</h3>
<Button>{translate('consent.privacy.notNow')}</Button>
<Button>{translate('consent.privacy.continue')}</Button>
```

**HealthConsentGate.tsx:**
```typescript
const { translate } = useTranslation();

<ResponsiveDialogTitle>
  {translate('consent.dataAccess.title')}
</ResponsiveDialogTitle>
<Button>{translate('buttons.cancel')}</Button>
<Button>{translate('consent.dataAccess.iConsent')}</Button>
```

### Phase 5: Refactor Audio Status Messages

**AudioStatusText.tsx:**
```typescript
import { useTranslation } from '@/hooks/useTranslation';

export function AudioStatusText({ audioState, errorMessage }: AudioStatusTextProps) {
  const { translate } = useTranslation();
  
  const statusMessages = {
    idle: '',
    listening: translate('audio.listening'),
    processing: translate('audio.processing'),
    error: translate('audio.connectionError'),
  };
  // ...
}
```

### Phase 6: Refactor Page Headers and SEO

**Pattern for all pages:**
```typescript
// Before
<StandardHeader
  title="Distribution & Sharing 🚀"
  description="Share your content across multiple channels"
/>

// After
const { translate } = useTranslation();
<StandardHeader
  title={translate('pages.sharing.title') + ' 🚀'}
  description={translate('pages.sharing.description')}
/>
```

**Priority pages (11 mobile screens):**
1. `src/pages/community/EventsAndMeetups.tsx`
2. `src/pages/community/LiveRooms.tsx`
3. `src/pages/community/MediaHub.tsx`
4. `src/pages/Discover.tsx`
5. `src/pages/discover/Orders.tsx`
6. `src/pages/Wallet.tsx`
7. `src/pages/Health.tsx`
8. `src/pages/Messages.tsx`
9. `src/pages/EditProfilePage.tsx`
10. `src/pages/BusinessHub.tsx`
11. `src/pages/Logout.tsx`

### Phase 7: Refactor Empty States

**Pattern:**
```typescript
// Before
<p className="text-muted-foreground">No groups found</p>

// After
<p className="text-muted-foreground">{translate('empty.noGroups')}</p>
```

**Files to update (33+ files):**
- `src/pages/admin/community/Groups.tsx`
- `src/components/reseller/SalesDetailDrawer.tsx`
- `src/pages/Search.tsx`
- `src/components/contacts/ContactsTabContent.tsx`
- `src/components/crossover/GroupMatchCard.tsx`
- And 28+ more

### Phase 8: Refactor Toast Messages

**Pattern:**
```typescript
// Before
toast({ title: "Error", description: "Failed to update status", variant: "destructive" });

// After
import { useI18nNotify } from "@/hooks/useI18nNotify";
const { notify } = useI18nNotify();
notify.error('toasts.error.updateFailed', 'toasts.error.updateFailedDesc');
```

**Files to update (9+ files):**
- `src/pages/admin/media/Music.tsx`
- `src/pages/admin/media/Videos.tsx`
- `src/pages/admin/media/Podcasts.tsx`
- `src/components/payment/PaymentMessageHandler.tsx`
- `src/components/dev/OperatorChat.tsx`
- `src/components/dev/LiveConsole.tsx`
- And more

---

## Files to Create/Modify

### Translation Files (Major Expansion)
| File | Current Lines | Estimated After |
|------|---------------|-----------------|
| `src/i18n/de.json` | 896 | ~1200 |
| `src/i18n/en.json` | 896 | ~1200 |

### Component Refactors (~250 files)

| Category | File Count | Key Changes |
|----------|------------|-------------|
| Page headers/SEO | ~50 | `translate()` for title/description |
| Empty states | ~33 | `translate('empty.*')` |
| Loading states | ~10 | `translate('states.*')` |
| Confirmation dialogs | ~4 | `useI18nNotify().confirm()` |
| Consent/privacy | ~3 | Full translation refactor |
| Toast messages | ~9 | `useI18nNotify().notify.*()` |
| Action buttons | ~50 | `translate('buttons.*')` |
| Card descriptions | ~27 | `translate()` for descriptions |
| Form placeholders | ~50 | `translate('placeholders.*')` |

---

## New Translation Keys Structure

```text
├── pages.*           # Page-specific titles/descriptions
│   ├── sharing.*
│   ├── health.*
│   ├── meetups.*
│   ├── support.*
│   └── ...
├── consent.*         # Privacy and consent dialogs
│   ├── privacy.*
│   └── dataAccess.*
├── audio.*           # Voice assistant status
├── smartSuggestions.* # AI/autopilot suggestions
├── placeholders.*    # Form input placeholders
├── cards.*           # Card component descriptions
└── (existing keys)
```

---

## Acceptance Criteria Checklist

- [ ] All 11 mobile screens fully translated
- [ ] Zero hardcoded visible strings in UI components
- [ ] All `window.confirm()` calls use `useI18nNotify().confirm()`
- [ ] All `toast()` calls use `useI18nNotify().notify.*()` or translation keys
- [ ] All empty states use `translate('empty.*')`
- [ ] All loading states use `translate('states.*')`
- [ ] All consent/privacy dialogs fully translated
- [ ] All page headers/SEO descriptions translated
- [ ] Missing keys logged in console with `[i18n]` prefix
- [ ] `[[missing:key]]` visual indicator in dev mode
- [ ] Language switch updates ALL visible text instantly
- [ ] Navigation through all 11 screens shows zero English when German selected
- [ ] Only user-generated content remains in original language

---

## Implementation Priority

### Batch 1: Core Infrastructure (High Priority)
1. Expand translation files with all new keys
2. Refactor 11 mobile screens
3. Update consent/privacy dialogs

### Batch 2: Common Components (Medium Priority)
4. Refactor empty states (33 files)
5. Refactor loading states (10 files)
6. Refactor confirmation dialogs (4 files)

### Batch 3: Complete Coverage (Lower Priority)
7. Refactor page headers/SEO (50 files)
8. Refactor toast messages (9 files)
9. Refactor card descriptions (27 files)
10. Refactor form placeholders (50 files)

---

## Technical Notes

- **Brand names stay English**: "Events & MeetUps", "Posts", "Vitana Index", "Autopilot"
- **German formal "Sie" form**: All German translations use formal address
- **Fallback chain**: German → English → `[[missing:key]]` marker
- **Missing key detection**: Already implemented in `useTranslation.ts`
- **Dynamic replacements**: Use `{variable}` syntax with `applyReplacements()` helper
