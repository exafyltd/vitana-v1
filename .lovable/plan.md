
# Global i18n Hardening — Make Untranslated UI Text Impossible

## Executive Summary

This plan enforces a **"NO RAW STRINGS"** rule across the entire application, ensuring that when German is selected, 100% of UI/system text displays in German. We will create typed wrapper components that only accept translation keys, implement dev-mode missing key detection, and systematically refactor all remaining hardcoded strings.

---

## Current State Analysis

### Existing Infrastructure ✅
| Component | Status |
|-----------|--------|
| Translation files | `de.json` (~1018 lines), `en.json` (~1018 lines) |
| Translation hook | `useTranslation()` with dev-mode `[[missing:key]]` indicator |
| I18n helpers | `useI18nNotify()`, `createI18nToast()`, `createI18nConfirm()` |
| Dev detection | Console warnings + visual `[[missing:key]]` indicator |

### Critical Gaps Still Present

#### 1. Toast Messages with Hardcoded Strings (205+ occurrences in 11 files)

**`src/hooks/useVitanaOrbTools.ts`** — 20+ navigation toasts:
```typescript
toast({ title: "Navigating to Hydration Tracker" });
toast({ title: "Navigating to Sleep Tracker" });
toast({ title: "Navigating to Calendar" });
// ...15+ more
```

**`src/pages/admin/media/*.tsx`** — CRUD toasts:
```typescript
toast({ title: "Error", description: "Failed to update status" });
toast({ title: "Success", description: "Podcast deleted" });
```

**`src/components/payment/PaymentMessageHandler.tsx`**:
```typescript
toast({ title: "Payment Completed! ✅", description: "..." });
toast({ title: "Already processed", description: "..." });
```

**`src/lib/ai-feed-transformers.ts`**:
```typescript
toast({ title: 'Activity hidden' });
```

#### 2. Constants/Config Arrays with Labels (106+ files)

**`src/lib/currencies.tsx`**:
```typescript
{ value: 'USD', label: 'USD', fullLabel: 'US Dollars' }
{ value: 'CREDITS', label: 'Credits', fullLabel: 'Platform Credits' }
```

**`src/components/wallet/mobile/MobileWalletQuickActions.tsx`**:
```typescript
{ label: 'Add Funds', ... }
{ label: 'Send', ... }
{ label: 'Exchange', ... }
{ label: 'Stake Tokens', ... }
```

**`src/components/business/UnifiedEarningsKPIStrip.tsx`**:
```typescript
{ label: "Total Earnings", ... }
{ label: "Last 30 Days", ... }
{ label: "Pending Payout", ... }
```

**`src/pages/admin/UserManagement.tsx`**:
```typescript
{ value: "community", label: "Community Member", description: "Basic community access" }
{ value: "patient", label: "Patient", description: "Patient portal access" }
```

#### 3. Empty States (33+ files with "No X found")

```typescript
"No groups found"
"No transactions found"
"No results found"
"No users found"
"No events found"
"No reports found"
"No apps found matching your search."
```

#### 4. Loading States (17+ files)

```typescript
"Loading..."
"Uploading..."
"Uploading... {progress}%"
```

#### 5. Placeholders (248+ files)

```typescript
placeholder="Search workers…"
placeholder="Search members, groups, or..."
placeholder="Add a language"
placeholder="Admin notes (optional)"
```

#### 6. Window.confirm with Raw Strings (1 file remaining)

**`src/utils/glassMode.ts`**:
```typescript
window.confirm('Share selection with AI?');
```

#### 7. StandardHeader Descriptions (199+ files)

```typescript
<StandardHeader
  title="Community Feed"
  description="Stay updated with posts, updates, and activities from your community."
/>
```

---

## Implementation Plan

### Phase 1: Create Type-Safe i18n Wrappers

Create components that **only accept translation keys**, making raw strings impossible:

**`src/components/ui/i18n-empty-state.tsx`** (NEW):
```typescript
interface I18nEmptyStateProps {
  titleKey: string;
  descriptionKey?: string;
  icon?: React.ReactNode;
  actionKey?: string;
  onAction?: () => void;
}

export function I18nEmptyState({ titleKey, descriptionKey, icon, actionKey, onAction }: I18nEmptyStateProps) {
  const { translate } = useTranslation();
  
  return (
    <div className="text-center py-12">
      {icon}
      <h3 className="text-lg font-semibold mb-2">{translate(titleKey)}</h3>
      {descriptionKey && <p className="text-muted-foreground">{translate(descriptionKey)}</p>}
      {actionKey && onAction && (
        <Button onClick={onAction}>{translate(actionKey)}</Button>
      )}
    </div>
  );
}
```

**`src/lib/i18n-helpers.ts`** — Add loading state helper:
```typescript
export function createI18nLoading(translate: TranslateFn) {
  return (stateKey?: string) => {
    return stateKey 
      ? translate(stateKey) 
      : translate('states.loading', 'Loading...');
  };
}
```

**Update `src/hooks/useI18nNotify.ts`** — Add navigation toast helper:
```typescript
export function useI18nNotify() {
  const { translate } = useTranslation();
  
  const notify = useMemo(() => createI18nToast(translate), [translate]);
  const confirm = useMemo(() => createI18nConfirm(translate), [translate]);
  
  // NEW: Navigation toast helper
  const navigateTo = useMemo(() => (destinationKey: string) => {
    rawToast({ title: translate('navigation.navigatingTo', 'Navigating to') + ' ' + translate(destinationKey) });
  }, [translate]);
  
  return { notify, confirm, navigateTo };
}
```

### Phase 2: Expand Translation Files

Add ~200 new keys covering all discovered gaps:

```json
{
  "navigation": {
    "navigatingTo": "Navigiere zu",
    "hydrationTracker": "Hydrations-Tracker",
    "sleepTracker": "Schlaf-Tracker",
    "nutritionTracker": "Ernährungs-Tracker",
    "workoutTracker": "Workout-Tracker",
    "biomarkers": "Biomarker",
    "calendar": "Kalender",
    "community": "Community",
    "groups": "Gruppen",
    "messages": "Nachrichten",
    "discover": "Entdecken",
    "supplements": "Nahrungsergänzung",
    "wallet": "Wallet",
    "profile": "Profil",
    "settings": "Einstellungen",
    "diary": "Tagebuch",
    "home": "Startseite"
  },
  "wallet": {
    "quickActions": {
      "title": "Schnellaktionen",
      "addFunds": "Geld hinzufügen",
      "send": "Senden",
      "exchange": "Umtauschen",
      "withdraw": "Abheben",
      "buyCredits": "Credits kaufen",
      "stakeTokens": "Token staken"
    },
    "currencies": {
      "usd": "US-Dollar",
      "vtna": "VTNA Token",
      "credits": "Plattform-Credits"
    }
  },
  "business": {
    "kpi": {
      "totalEarnings": "Gesamteinnahmen",
      "last30Days": "Letzte 30 Tage",
      "pendingPayout": "Ausstehende Auszahlung",
      "inWallet": "Im Wallet"
    }
  },
  "admin": {
    "roles": {
      "community": "Community-Mitglied",
      "communityDesc": "Grundlegender Community-Zugang",
      "patient": "Patient",
      "patientDesc": "Patienten-Portal Zugang",
      "professional": "Fachperson",
      "professionalDesc": "Zugang für medizinische Fachkräfte",
      "staff": "Mitarbeiter",
      "staffDesc": "Mitarbeiter-Portal Zugang",
      "admin": "Administrator",
      "adminDesc": "Volle Mandantenverwaltung"
    },
    "media": {
      "updateSuccess": "Status erfolgreich aktualisiert",
      "updateFailed": "Status-Aktualisierung fehlgeschlagen",
      "deleteSuccess": "Erfolgreich gelöscht",
      "deleteFailed": "Löschen fehlgeschlagen",
      "podcastDeleted": "Podcast gelöscht",
      "musicDeleted": "Musik gelöscht",
      "videoDeleted": "Video gelöscht"
    }
  },
  "payment": {
    "completed": "Zahlung abgeschlossen!",
    "alreadyProcessed": "Bereits verarbeitet",
    "requestIs": "Diese Anfrage ist {status}.",
    "alreadyAccepted": "Diese Zahlungsanforderung wurde bereits akzeptiert.",
    "declined": "Zahlung abgelehnt",
    "declinedDesc": "Zahlungsanforderung wurde abgelehnt",
    "exchangeSuccess": "Umtausch & Senden erfolgreich!",
    "insufficientBalance": "Unzureichendes Guthaben",
    "insufficientBalanceDesc": "Sie haben nicht genug {currency} für diesen Umtausch",
    "transactionFailed": "Transaktion fehlgeschlagen",
    "balanceRefreshed": "Guthaben aktualisiert",
    "refreshFailed": "Aktualisierung fehlgeschlagen"
  },
  "glassMode": {
    "shareWithAI": "Auswahl mit KI teilen?",
    "screenSharingComingSoon": "Bildschirmfreigabe bald verfügbar",
    "screenSharingDesc": "Teilen Sie Ihren Bildschirm mit VITANA für kontextuelle Unterstützung.",
    "screenSharingStopped": "Bildschirmfreigabe beendet",
    "glassModeDisabled": "Glass-Modus deaktiviert",
    "cameraModeComingSoon": "Kamera-Modus bald verfügbar",
    "cameraModeDesc": "Vision-basierte KI-Interaktionen werden im nächsten Update verfügbar sein.",
    "diaryReady": "Tagebuch bereit",
    "openingDiary": "Öffne Tagebucheintrag",
    "autopilotActivated": "Autopilot aktiviert",
    "runningAutopilot": "Autopilot-Modus läuft",
    "textInputReady": "Texteingabe bereit",
    "typeMessage": "Sie können jetzt Ihre Nachricht eingeben",
    "actionFailed": "Aktion fehlgeschlagen",
    "couldNotExecute": "Konnte {action} nicht ausführen"
  },
  "aiFeed": {
    "activityHidden": "Aktivität ausgeblendet",
    "boost": "Boost",
    "hide": "Ausblenden",
    "activityDetails": "Aktivitätsdetails",
    "status": "Status",
    "category": "Kategorie",
    "reason": "Grund"
  },
  "placeholders": {
    "searchWorkers": "Mitarbeiter suchen...",
    "searchMembers": "Mitglieder, Gruppen suchen...",
    "addLanguage": "Sprache hinzufügen",
    "adminNotes": "Admin-Notizen (optional)",
    "searchApps": "Apps und Dienste suchen...",
    "searchMatches": "Matches suchen...",
    "selectTemplate": "Vorlage auswählen",
    "enterRunName": "Namen für diesen Lauf eingeben...",
    "selectTriggerMode": "Auslösemodus auswählen",
    "addContext": "Zusätzlichen Kontext oder Notizen hinzufügen...",
    "searchSharing": "Teilungsaktivitäten suchen...",
    "searchVideos": "Videos suchen...",
    "shareBio": "Teilen Sie Ihre Wellness-Reise, Leidenschaften und was Sie einzigartig macht...",
    "locationExample": "z.B. München, DE • Berlin, DE • Remote",
    "labelExample": "Label (z.B. Website, Instagram, LinkedIn, Portfolio)",
    "urlExample": "https://ihre-website.com oder @benutzername"
  },
  "densityOptions": {
    "cozy": "Gemütlich",
    "compact": "Kompakt",
    "gallery": "Galerie"
  },
  "calendarPopup": {
    "quickAdd": "Schnell hinzufügen",
    "eventFormComingSoon": "Event-Erstellungsformular bald verfügbar",
    "externalSync": "Externe Synchronisierung",
    "connectingCalendars": "Verbinde mit externen Kalendern..."
  }
}
```

### Phase 3: Refactor Remaining Components

#### 3.1 Navigation Toasts — `useVitanaOrbTools.ts`

```typescript
// Before
toast({ title: "Navigating to Hydration Tracker" });

// After
import { useTranslation } from '@/hooks/useTranslation';

const { translate } = useTranslation();
toast({ title: translate('navigation.navigatingTo') + ' ' + translate('navigation.hydrationTracker') });
```

#### 3.2 Wallet Quick Actions — `MobileWalletQuickActions.tsx`

```typescript
// Before
const actions = [
  { id: 'add-funds', label: 'Add Funds', ... },
  { id: 'send', label: 'Send', ... },
];

// After
const { translate } = useTranslation();
const actions = [
  { id: 'add-funds', label: translate('wallet.quickActions.addFunds'), ... },
  { id: 'send', label: translate('wallet.quickActions.send'), ... },
];
```

#### 3.3 Currency Labels — `currencies.tsx`

Convert to function that accepts translator:

```typescript
// Before
export const CURRENCY_CONFIGS = [
  { value: 'USD', label: 'USD', fullLabel: 'US Dollars' },
];

// After
export const getCurrencyConfigs = (translate: TranslateFn) => [
  { value: 'USD', label: 'USD', fullLabel: translate('wallet.currencies.usd', 'US Dollars') },
  { value: 'VTNA', label: 'VTNA', fullLabel: translate('wallet.currencies.vtna', 'VTNA Tokens') },
  { value: 'CREDITS', label: translate('wallet.currencies.credits', 'Credits'), fullLabel: translate('wallet.currencies.creditsLabel', 'Platform Credits') },
];
```

#### 3.4 Admin Media Toasts — `Podcasts.tsx`, `Music.tsx`, `Videos.tsx`

```typescript
// Before
toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
toast({ title: "Success", description: "Podcast deleted" });

// After
import { useI18nNotify } from '@/hooks/useI18nNotify';
const { notify } = useI18nNotify();

notify.error('toasts.error.generic', 'admin.media.updateFailed');
notify.success('toasts.success.deleted', 'admin.media.podcastDeleted');
```

#### 3.5 Payment Handler — `PaymentMessageHandler.tsx`

```typescript
// Before
toast({ title: "Payment Completed! ✅", description: `${formatCurrency(...)} sent` });

// After
notify.success('payment.completed', 'payment.sentSuccess', { amount: formatCurrency(...) });
```

#### 3.6 Business KPI Labels — `UnifiedEarningsKPIStrip.tsx`

```typescript
const { translate } = useTranslation();

const kpiCards = [
  { label: translate('business.kpi.totalEarnings'), ... },
  { label: translate('business.kpi.last30Days'), ... },
  { label: translate('business.kpi.pendingPayout'), ... },
  { label: translate('business.kpi.inWallet'), ... },
];
```

#### 3.7 Admin Role Options — `UserManagement.tsx`

```typescript
const { translate } = useTranslation();

const ROLE_OPTIONS = [
  { value: "community", label: translate('admin.roles.community'), description: translate('admin.roles.communityDesc') },
  { value: "patient", label: translate('admin.roles.patient'), description: translate('admin.roles.patientDesc') },
  // ...
];
```

#### 3.8 Glass Mode Confirm — `glassMode.ts`

This is a utility class, not a React component, so we need to pass the translate function:

```typescript
// In glassMode.ts
private showTextSelectionPrompt(text: string, translate?: TranslateFn) {
  const message = translate 
    ? translate('glassMode.shareWithAI', 'Share selection with AI?')
    : 'Share selection with AI?';
  const share = window.confirm(message);
  // ...
}
```

### Phase 4: Create i18n-First Empty State Component

**`src/components/ui/i18n-empty-state.tsx`**:

```typescript
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface I18nEmptyStateProps {
  titleKey: string;
  descriptionKey?: string;
  Icon?: LucideIcon;
  actionKey?: string;
  onAction?: () => void;
  className?: string;
}

export function I18nEmptyState({ 
  titleKey, 
  descriptionKey, 
  Icon, 
  actionKey, 
  onAction,
  className 
}: I18nEmptyStateProps) {
  const { translate } = useTranslation();
  
  return (
    <div className={`text-center py-12 ${className || ''}`}>
      {Icon && <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />}
      <h3 className="text-lg font-semibold mb-2">{translate(titleKey)}</h3>
      {descriptionKey && (
        <p className="text-muted-foreground">{translate(descriptionKey)}</p>
      )}
      {actionKey && onAction && (
        <Button onClick={onAction} className="mt-4">
          {translate(actionKey)}
        </Button>
      )}
    </div>
  );
}
```

**Usage pattern:**
```typescript
// Before
<div className="text-center py-12">
  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
  <p className="text-muted-foreground">No groups found</p>
</div>

// After
<I18nEmptyState 
  Icon={Users}
  titleKey="empty.noGroups"
  descriptionKey="empty.noGroupsDesc"
/>
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/ui/i18n-empty-state.tsx` | Type-safe empty state component |

### Translation Files (Major Expansion)
| File | Current Lines | Estimated After |
|------|---------------|-----------------|
| `src/i18n/de.json` | ~1018 | ~1250 |
| `src/i18n/en.json` | ~1018 | ~1250 |

### Components to Refactor

| File | Changes |
|------|---------|
| `src/hooks/useVitanaOrbTools.ts` | All 20+ navigation toasts |
| `src/lib/currencies.tsx` | Convert to function with translator |
| `src/components/wallet/mobile/MobileWalletQuickActions.tsx` | 6 action labels |
| `src/components/business/UnifiedEarningsKPIStrip.tsx` | 4 KPI labels |
| `src/pages/admin/UserManagement.tsx` | Role labels and descriptions |
| `src/pages/admin/media/Podcasts.tsx` | CRUD toasts |
| `src/pages/admin/media/Music.tsx` | CRUD toasts |
| `src/pages/admin/media/Videos.tsx` | CRUD toasts |
| `src/components/payment/PaymentMessageHandler.tsx` | 15+ payment toasts |
| `src/lib/ai-feed-transformers.ts` | Action labels and toasts |
| `src/utils/glassMode.ts` | window.confirm prompt |
| `src/components/community/DensityControl.tsx` | Density option labels |
| `src/components/CalendarPopup.tsx` | Toast messages |
| `src/components/dev/DevSidebar.tsx` | Search placeholders |
| `src/components/profile/editor/AboutForm.tsx` | Form placeholders |
| `src/pages/admin/community/Groups.tsx` | Status labels + empty state |
| `src/pages/admin/community/ReportedContent.tsx` | Empty state |
| `src/pages/Search.tsx` | Empty state |
| `src/components/ConnectAppPopup.tsx` | Empty state + placeholder |
| `src/pages/discover/Supplements.tsx` | Empty state |
| ~30 more files | Various hardcoded strings |

---

## New Translation Key Structure

```text
├── navigation.*        # "Navigating to X" messages
├── wallet.quickActions.* # Add Funds, Send, Exchange, etc.
├── wallet.currencies.* # Currency labels
├── business.kpi.*      # KPI card labels
├── admin.roles.*       # Role labels and descriptions
├── admin.media.*       # CRUD operation messages
├── payment.*           # Payment flow messages
├── glassMode.*         # Glass mode prompts
├── aiFeed.*            # AI feed action labels
├── placeholders.*      # All form placeholders
├── densityOptions.*    # Layout density options
├── calendarPopup.*     # Calendar popup messages
└── (existing keys...)
```

---

## Acceptance Criteria Checklist

- [ ] All toast calls use `useI18nNotify()` or `translate()` 
- [ ] All config arrays with labels use translation keys
- [ ] All empty states use `I18nEmptyState` or `translate()`
- [ ] All loading states use `translate('states.*')`
- [ ] All placeholders use `translate('placeholders.*')`
- [ ] All `window.confirm()` calls use translated strings
- [ ] Zero hardcoded English strings in any UI component
- [ ] Missing keys show `[[missing:key]]` in dev mode
- [ ] Console warnings for missing keys in dev mode
- [ ] Language switch updates ALL visible text instantly
- [ ] Navigation through 11 mobile screens shows zero English when German selected
- [ ] Only user-generated content remains in original language

---

## Implementation Priority

### Batch 1: High-Traffic Components (Critical)
1. Navigation toasts in `useVitanaOrbTools.ts`
2. Wallet quick actions
3. Payment handler toasts
4. i18n empty state component

### Batch 2: Admin & Business (Medium)
5. Admin media toasts
6. Business KPI labels
7. User management role labels
8. Currency labels

### Batch 3: Config & Placeholders (Lower)
9. Form placeholders
10. Density controls
11. Calendar popup
12. Remaining empty states

---

## Technical Notes

- **Brand names stay English**: "Vitana Index", "Autopilot", "VTNA"
- **German formal "Sie" form**: All German translations use formal address
- **Fallback chain**: German → English → `[[missing:key]]` marker
- **Dynamic replacements**: Use `{variable}` syntax with `applyReplacements()` helper
- **Non-React files**: Pass `translate` function as parameter to utility classes
