
# Complete German i18n Translation — All UI Components

## Executive Summary

This plan systematically translates ALL remaining hardcoded English strings across the application to ensure 100% German localization when German is selected. The scope includes popups, cards, helper text, empty states, segmented tabs, buttons, subtitles, dialog titles, form labels, placeholders, toast messages, and table headers.

---

## Categories of Remaining Hardcoded Strings

### 1. Portal/Auth Pages (4 files) — HIGH PRIORITY
All tenant portal pages have hardcoded English:

| File | Hardcoded Strings |
|------|-------------------|
| `MaxinaPortal.tsx` | "Sign In", "Join Maxina", "Email", "Password", "Keep me logged in", "Forgot password?", "Signing in…", "Or continue with", "Welcome back to Maxina.", "Sign in to continue your journey.", "Full Name", "Your full name", "I am joining as:", "Community", "Patient", "Pro", "Admin", "Join the Maxina community.", "Create your account and begin your journey." |
| `AlkalmaPortal.tsx` | "Sign In", "Join AlKalma", "Email", "Password", etc. |
| `EarthlinksPortal.tsx` | "Sign In", "Join Earthlinks", "Email", "Password", etc. |
| `CommunityPortal.tsx` | "Sign In", "Join Community", "Email", "Password", etc. |

### 2. Campaign & Sharing Dialogs (3 files)
| File | Hardcoded Strings |
|------|-------------------|
| `DeleteCampaignDialog.tsx` | "Delete Campaign?", "Deleting ... will permanently remove all related drafts and analytics.", "Don't ask me again for draft campaigns", "Cancel", "Delete Permanently" |
| `CampaignCreationHeader.tsx` | "Create Campaign", "Step X of 4", "Your Campaigns", "drafts", "live", "Pro Tip", all step tips |

### 3. Admin Tabs & Table Headers (5+ files)
| File | Hardcoded Strings |
|------|-------------------|
| `Groups.tsx` (admin) | "All Groups", "Pending", "Approved", "Flagged", "Rejected", "Loading groups...", "No groups found", "Group Name", "Category", "Members", "Privacy", "Status", "Actions" |
| `CommunityRoomsAdmin.tsx` | "Active Rooms", "Scheduled", "Analytics", "Moderation" |
| `UserManagement.tsx` | Role labels, "Community Member", "Patient", etc., dialog buttons |

### 4. Popup Tabs & Actions (10+ files)
| File | Hardcoded Strings |
|------|-------------------|
| `CreatePackagePopup.tsx` | "Details", "Data Types", "Timeline", "Sharing", "Create Health Data Package", "Package Information" |
| `ManageMyActionsPopup.tsx` | "Pending", "New Action", "Prioritize", "Pending Actions", "Confirm All", "Snooze All" |
| `ReactionPopover.tsx` | "Reactions" |
| `AttachmentMenu.tsx` | "Attach" |
| `SoundscapeControl.tsx` | "Volume" |

### 5. Empty States (33+ files)
Common patterns found:
- "No apps found matching your search."
- "No events found"
- "No contacts found"
- "No groups found"
- "No results found"
- "No reports found"
- "No users found"

### 6. Loading States (17+ files)
- "Loading..."
- "Uploading..."
- "Uploading... {progress}%"
- "Loading groups..."
- "Loading messages..."

### 7. Dialog Buttons (70+ occurrences)
- "Cancel" (70 files)
- "Confirm", "Delete", "Save", "Apply", "Close"
- "Reschedule", "Add Notes"

### 8. Toast Messages with Hardcoded Strings (37+ files)
Pattern: `toast({ title: "Error", description: "..." })`
- "Error", "Success", "Failed to...", "Search Error"
- All payment toasts, conversation toasts, etc.

### 9. Placeholders (247+ files)
- `placeholder="Search..."`
- `placeholder="Enter your..."` 
- `placeholder="e.g., ..."`

### 10. SEO & StandardHeader Descriptions (199+ files)
- `title="Settings"`, `description="Manage your account..."`
- All page-level metadata

---

## Implementation Plan

### Phase 1: Expand Translation Files (~300 new keys)

Add comprehensive keys to cover all discovered gaps:

```json
{
  "portals": {
    "maxina": {
      "title": "Maxina Gesundheitsplattform",
      "signIn": "Anmelden",
      "joinMaxina": "Maxina beitreten",
      "welcomeBack": "Willkommen zurück bei Maxina.",
      "continueJourney": "Melden Sie sich an, um Ihre Reise fortzusetzen.",
      "joinCommunity": "Treten Sie der Maxina-Community bei.",
      "createAccount": "Erstellen Sie Ihr Konto und beginnen Sie Ihre Reise.",
      "signingIn": "Wird angemeldet…",
      "joiningAs": "Ich trete bei als:",
      "roles": {
        "community": "Community",
        "patient": "Patient",
        "professional": "Pro",
        "admin": "Admin"
      }
    },
    "alkalma": { "joinAlkalma": "AlKalma beitreten", ... },
    "earthlinks": { "joinEarthlinks": "Earthlinks beitreten", ... },
    "community": { "joinCommunity": "Community beitreten", ... }
  },
  "campaigns": {
    "delete": {
      "title": "Kampagne löschen?",
      "description": "Das Löschen von \"{name}\" wird alle zugehörigen Entwürfe und Analysen dauerhaft entfernen. Diese Aktion kann nicht rückgängig gemacht werden.",
      "dontAskAgain": "Bei Entwürfen nicht mehr fragen",
      "deletePermanently": "Dauerhaft löschen"
    },
    "creation": {
      "title": "Kampagne erstellen",
      "stepOf": "Schritt {current} von {total}",
      "yourCampaigns": "Ihre Kampagnen",
      "drafts": "Entwürfe",
      "live": "Live",
      "proTip": "Profi-Tipp",
      "tips": {
        "1": "Klare Namen helfen Ihnen, Kampagnen später zu finden",
        "2": "Verbinden Sie Kanäle jetzt für sofortige Planung",
        "3": "Die Launch-Vorlage funktioniert für die meisten Ankündigungen",
        "4": "Intelligente Planung verwendet Ihre bisherigen Engagement-Daten"
      }
    }
  },
  "adminTabs": {
    "groups": {
      "all": "Alle Gruppen",
      "pending": "Ausstehend",
      "approved": "Genehmigt",
      "flagged": "Markiert",
      "rejected": "Abgelehnt"
    },
    "rooms": {
      "active": "Aktive Räume",
      "scheduled": "Geplant",
      "analytics": "Analytik",
      "moderation": "Moderation"
    }
  },
  "tableHeaders": {
    "groupName": "Gruppenname",
    "category": "Kategorie",
    "members": "Mitglieder",
    "privacy": "Datenschutz",
    "status": "Status",
    "actions": "Aktionen"
  },
  "popupTabs": {
    "details": "Details",
    "dataTypes": "Datentypen",
    "timeline": "Zeitachse",
    "sharing": "Teilen",
    "pending": "Ausstehend",
    "newAction": "Neue Aktion",
    "prioritize": "Priorisieren"
  },
  "popupTitles": {
    "createHealthDataPackage": "Gesundheitsdatenpaket erstellen",
    "packageInformation": "Paketinformationen",
    "reactions": "Reaktionen",
    "attach": "Anhängen",
    "volume": "Lautstärke"
  },
  "actionButtons": {
    "confirmAll": "Alle bestätigen",
    "snoozeAll": "Alle verschieben",
    "reschedule": "Neu planen",
    "addNotes": "Notizen hinzufügen",
    "changePlan": "Plan ändern",
    "cancelSubscription": "Abonnement kündigen"
  },
  "formLabels": {
    "fullName": "Vollständiger Name",
    "yourFullName": "Ihr vollständiger Name",
    "actionTitle": "Aktionstitel",
    "actionTitlePlaceholder": "z.B. Abendspaziergang, Arzt anrufen",
    "optionalNotes": "Optionale Notizen",
    "additionalDetails": "Zusätzliche Details oder Kontext..."
  },
  "empty": {
    "noAppsFound": "Keine Apps gefunden, die Ihrer Suche entsprechen.",
    "noEventsFound": "Keine Veranstaltungen gefunden",
    "noContactsFound": "Keine Kontakte gefunden",
    "noContactsFoundMatching": "Keine Kontakte gefunden, die \"{query}\" entsprechen",
    "noGroupsFound": "Keine Gruppen gefunden",
    "noResultsFound": "Keine Ergebnisse gefunden",
    "noReportsFound": "Keine Berichte gefunden",
    "noUsersFound": "Keine Benutzer gefunden",
    "noTransactionsFound": "Keine Transaktionen gefunden",
    "noEventsYet": "Noch keine Veranstaltungen. Erstellen Sie zuerst eine Veranstaltung.",
    "tryAdjustingFilters": "Versuchen Sie, Ihre Filter oder Suchanfrage anzupassen"
  },
  "loading": {
    "default": "Wird geladen...",
    "groups": "Gruppen werden geladen...",
    "messages": "Nachrichten werden geladen...",
    "uploading": "Wird hochgeladen...",
    "uploadingProgress": "Wird hochgeladen... {progress}%"
  }
}
```

### Phase 2: Refactor Portal Pages (4 files)

**Pattern for MaxinaPortal.tsx:**
```typescript
const { translate } = useTranslation();

<TabsTrigger value="signin">{translate('authPage.signIn')}</TabsTrigger>
<TabsTrigger value="signup">{translate('portals.maxina.joinMaxina')}</TabsTrigger>
<Label>{translate('authPage.email')}</Label>
<Label>{translate('authPage.password')}</Label>
<CardTitle>{translate('portals.maxina.welcomeBack')}</CardTitle>
<CardDescription>{translate('portals.maxina.continueJourney')}</CardDescription>
```

### Phase 3: Refactor Campaign Dialogs (2 files)

**DeleteCampaignDialog.tsx:**
```typescript
const { translate } = useTranslation();

<ResponsiveConfirmDialogTitle>
  {translate('campaigns.delete.title')}
</ResponsiveConfirmDialogTitle>
<ResponsiveConfirmDialogDescription>
  {applyReplacements(translate('campaigns.delete.description'), { name: campaignName })}
</ResponsiveConfirmDialogDescription>
<Label>{translate('campaigns.delete.dontAskAgain')}</Label>
<ResponsiveConfirmDialogCancel>{translate('buttons.cancel')}</ResponsiveConfirmDialogCancel>
<ResponsiveConfirmDialogAction>{translate('campaigns.delete.deletePermanently')}</ResponsiveConfirmDialogAction>
```

### Phase 4: Refactor Admin Tabs (5+ files)

**Groups.tsx pattern:**
```typescript
const { translate } = useTranslation();

<TabsTrigger value="all">{translate('adminTabs.groups.all')}</TabsTrigger>
<TabsTrigger value="pending">{translate('adminTabs.groups.pending')}</TabsTrigger>
// Table headers
<TableHead>{translate('tableHeaders.groupName')}</TableHead>
<TableHead>{translate('tableHeaders.category')}</TableHead>
// Empty state
<p>{translate('empty.noGroupsFound')}</p>
// Loading state
<div>{translate('loading.groups')}</div>
```

### Phase 5: Refactor Popup Components (10+ files)

**CreatePackagePopup.tsx:**
```typescript
<DialogTitle>{translate('popupTitles.createHealthDataPackage')}</DialogTitle>
<TabsTrigger value="details">{translate('popupTabs.details')}</TabsTrigger>
<TabsTrigger value="data">{translate('popupTabs.dataTypes')}</TabsTrigger>
```

**ManageMyActionsPopup.tsx:**
```typescript
<TabsTrigger value="pending">{translate('popupTabs.pending')}</TabsTrigger>
<Button>{translate('actionButtons.confirmAll')}</Button>
<Button>{translate('actionButtons.snoozeAll')}</Button>
```

### Phase 6: Refactor Cancel Buttons (11 files)

All `ResponsiveConfirmDialogCancel>Cancel<` instances:
```typescript
<ResponsiveConfirmDialogCancel>
  {translate('buttons.cancel')}
</ResponsiveConfirmDialogCancel>
```

Files: `LiveRooms.tsx`, `UserManagement.tsx`, `LiveRoomDrawer.tsx`, `ContactListItem.tsx`, `MediaHub.tsx`, `ConversationCard.tsx`, `ActivityCard.tsx`, `ProfileDrawer.tsx`, `Appointments.tsx`, `DoctorsCoaches.tsx`, `Billing.tsx`

### Phase 7: Refactor Empty States (33+ files)

Convert to `I18nEmptyState` component or use `translate()`:
```typescript
// Before
<p className="text-muted-foreground">No groups found</p>

// After
<p className="text-muted-foreground">{translate('empty.noGroupsFound')}</p>
```

### Phase 8: Refactor Toast Messages (37+ files)

Convert all hardcoded toast calls:
```typescript
// Before
toast({ title: "Error", description: "Failed to search users" });

// After
toast({ 
  title: translate('toasts.error.generic'), 
  description: translate('toasts.error.searchFailed') 
});
```

---

## Files to Modify

### Translation Files
| File | Changes |
|------|---------|
| `src/i18n/de.json` | +300 new keys |
| `src/i18n/en.json` | +300 new keys |

### Portal Pages (4 files)
- `src/pages/portals/MaxinaPortal.tsx`
- `src/pages/portals/AlkalmaPortal.tsx`
- `src/pages/portals/EarthlinksPortal.tsx`
- `src/pages/portals/CommunityPortal.tsx`

### Campaign Components (2 files)
- `src/components/sharing/DeleteCampaignDialog.tsx`
- `src/components/sharing/CampaignCreationHeader.tsx`

### Admin Pages (5 files)
- `src/pages/admin/community/Groups.tsx`
- `src/pages/admin/CommunityRoomsAdmin.tsx`
- `src/pages/admin/UserManagement.tsx`
- `src/pages/admin/community/ReportedContent.tsx`
- `src/pages/admin/Dashboard.tsx`

### Popup Components (10 files)
- `src/components/CreatePackagePopup.tsx`
- `src/components/ManageMyActionsPopup.tsx`
- `src/components/messages/ReactionPopover.tsx`
- `src/components/messages/AttachmentMenu.tsx`
- `src/components/audio/SoundscapeControl.tsx`
- `src/components/NewConversationPopup.tsx`
- `src/components/SmartPackagePopup.tsx`
- `src/components/ConnectAppPopup.tsx`
- `src/components/contacts/ContactsTabContent.tsx`
- `src/components/sharing/EditPackageDialog.tsx`

### Dialog/Confirm Components (11 files)
- `src/pages/community/LiveRooms.tsx`
- `src/pages/community/MediaHub.tsx`
- `src/components/liverooms/LiveRoomDrawer.tsx`
- `src/components/contacts/ContactListItem.tsx`
- `src/components/memory/ConversationCard.tsx`
- `src/components/memory/ActivityCard.tsx`
- `src/components/profile/ProfileDrawer.tsx`
- `src/pages/patient/Appointments.tsx`
- `src/pages/discover/DoctorsCoaches.tsx`
- `src/pages/settings/Billing.tsx`
- `src/pages/admin/UserManagement.tsx`

### Empty State Components (15+ files)
- `src/components/ai-feed/VisualHistoryTimeline.tsx`
- `src/pages/Search.tsx`
- `src/components/crossover/GroupMatchCard.tsx`
- `src/components/events/ContactPicker.tsx`
- `src/pages/settings/TenantRole.tsx`
- And 10+ more

### Toast Message Files (20+ files)
- `src/components/payment/GlobalPaymentRequest.tsx`
- `src/components/payment/PaymentRequestPopup.tsx`
- `src/components/NewConversationPopup.tsx`
- `src/components/calendar/EnhancedCalendarPopup.tsx`
- And 16+ more

---

## New Translation Key Structure

```text
├── portals.*              # Portal-specific (Maxina, AlKalma, etc.)
├── campaigns.*            # Campaign creation/deletion
│   ├── delete.*
│   └── creation.*
├── adminTabs.*            # Admin section tabs
│   ├── groups.*
│   └── rooms.*
├── tableHeaders.*         # All table column headers
├── popupTabs.*            # Popup internal tabs
├── popupTitles.*          # Popup dialog titles
├── actionButtons.*        # Action button labels
├── formLabels.*           # Form field labels
├── empty.*                # All empty state messages
├── loading.*              # All loading state messages
└── (existing keys...)
```

---

## Priority Order

### Batch 1: User-Facing Critical (Do First)
1. Portal pages (MaxinaPortal, etc.) — first thing users see
2. Campaign dialogs — common user flow
3. Cancel/Confirm buttons — appears everywhere

### Batch 2: Common Components
4. Popup tabs and titles
5. Empty states
6. Loading states

### Batch 3: Admin & Backend
7. Admin tabs and table headers
8. Toast messages
9. Form labels and placeholders

---

## Acceptance Criteria

- [ ] All 4 portal pages fully translated
- [ ] DeleteCampaignDialog fully translated
- [ ] CampaignCreationHeader fully translated
- [ ] All admin tabs translated
- [ ] All table headers translated
- [ ] All "Cancel" buttons use translation keys
- [ ] All empty states use translation keys
- [ ] All loading states use translation keys
- [ ] All popup tabs/titles translated
- [ ] Zero hardcoded English in any UI component
- [ ] Switching to German shows 100% German text
- [ ] Only user-generated content remains in original language
