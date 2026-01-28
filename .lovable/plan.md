
# Global i18n Enforcement + Sweep for Business/Profile/Index

## Problem Summary

When German is selected, mixed English/German text appears across Business Hub, Profile, and Index pages. The following hardcoded English strings were identified:

### Business Hub Components (14 files, ~80 strings)

| File | Hardcoded English |
|------|-------------------|
| `BusinessAcceleratorCenterCTA.tsx` | "Ready to earn with VITANA?", "Choose a path and we'll guide you...", "Start earning", "How do you want to earn?", "Pick one — you can always do the others later", "Create an Event", "Host your own event and sell tickets.", "Add Events to Inventory", "Resell curated events and earn commission.", "Create a Service", "Offer sessions people can book.", "Create a Promotion", "Boost visibility and share to social." |
| `MobileEarningPortal.tsx` | Same as above (mobile version) + "Host & sell tickets", "Resell & earn", "Offer bookings", "Boost visibility", "Pick one — you can explore others later" |
| `EarningsHistoryLedger.tsx` | "All", "Direct Sales", "Reseller", "No earnings history yet", "Start selling to see your transactions here", "Tickets Sold", "Gross Amount", "You Earned", "Status", "Paid to Wallet", "Pending Payout", "Transaction ID", "View in Wallet", "Last 30 Days", "Last 7 Days", "Last 90 Days", "Details", "Close" |
| `EarningsActivityFeed.tsx` | "Earnings Activity", "View in Wallet", "All", "Direct Sales", "Reseller", "Loading...", "No earnings yet. Start selling to see activity here." |
| `EarningsBySourceCards.tsx` | "Tickets Sold", "Reseller Commissions" |
| `BusinessHubKPICards.tsx` | "Revenue", "This month", "Active Clients", "Total active", "Upcoming Sessions", "This week", "Top Performer", "No data yet", "Create a service to get started.", "bookings" |
| `ResellerHeader.tsx` | "Upcoming Events", "Next:", "Reseller code", "Tickets Sold", "Last 30 days", "Revenue", "Top Performer", "No sales yet", "Share a link to start earning.", "tickets" |
| `ResellerSalesTab.tsx` | "No sales yet", "Share your reseller links or create a promotion to start earning commissions.", "Share reseller link", "Create promotion", "Select an event to share", "Pick an event to generate your reseller link", "No events available to sell", "commission", "All time", "Last 30 days", "Last 7 days", "Transfer to Wallet", "Attributed Sales by Event", "No sales match the current filters", "Commission Earned", "Pending Payout", "In Wallet", "Last Payout", "No payouts yet", "View in Wallet", "Mock data active" |
| `TransferToWalletDialog.tsx` | "Transfer to Wallet", "Transfer your pending reseller commissions to your VITANA Wallet.", "Pending", "Wallet", "This will credit your earnings instantly to your wallet balance.", "Cancel", "Transferring...", "Transfer" |
| `OrganizerEventSalesSheet.tsx` | "Tickets Sold" |

### Profile Components (2 files, ~8 strings)

| File | Hardcoded English |
|------|-------------------|
| `MobileAutopilotBanner.tsx` | "Polish your bio, archetype & showcase", "Try" |
| `MobileIdentityCard.tsx` | "Vitana Index", "Based on activity, health engagement & contribution", "View my Longevity ID" |

### Reseller/Toast Components (2 files)

| File | Hardcoded English |
|------|-------------------|
| `ResellerHeader.tsx` | `toast.success("Reseller code copied!")` |

---

## Implementation Plan

### Phase 1: Expand Translation Files (~100 new keys)

Add comprehensive keys to `src/i18n/de.json` and `src/i18n/en.json`:

```json
{
  "business": {
    "earning": {
      "readyToEarn": "Bereit, mit VITANA zu verdienen?",
      "choosePathGuide": "Wählen Sie einen Weg und wir führen Sie zu Ihrem ersten Einkommensstrom.",
      "startEarning": "Jetzt verdienen",
      "howToEarn": "Wie möchten Sie verdienen?",
      "pickOne": "Wählen Sie eine Option — Sie können die anderen später erkunden.",
      "createEvent": "Event erstellen",
      "createEventDesc": "Veranstalten Sie Ihr eigenes Event und verkaufen Sie Tickets.",
      "addToInventory": "Events zum Inventar hinzufügen",
      "addToInventoryDesc": "Kuratierte Events weiterverkaufen und Provision verdienen.",
      "createService": "Service erstellen",
      "createServiceDesc": "Bieten Sie buchbare Sitzungen an.",
      "createPromotion": "Promotion erstellen",
      "createPromotionDesc": "Sichtbarkeit erhöhen und in sozialen Medien teilen.",
      "hostAndSell": "Veranstalten & Tickets verkaufen",
      "resellAndEarn": "Weiterverkaufen & verdienen",
      "offerBookings": "Buchungen anbieten",
      "boostVisibility": "Sichtbarkeit erhöhen"
    },
    "history": {
      "all": "Alle",
      "directSales": "Direktverkäufe",
      "reseller": "Wiederverkäufer",
      "noEarningsYet": "Noch keine Einnahmen",
      "startSellingToSee": "Beginnen Sie mit dem Verkauf, um Ihre Transaktionen hier zu sehen",
      "ticketsSold": "Tickets verkauft",
      "grossAmount": "Bruttobetrag",
      "youEarned": "Sie haben verdient",
      "paidToWallet": "An Wallet gezahlt",
      "pendingPayout": "Ausstehende Auszahlung",
      "transactionId": "Transaktions-ID",
      "viewInWallet": "Im Wallet anzeigen",
      "last7Days": "Letzte 7 Tage",
      "last30Days": "Letzte 30 Tage",
      "last90Days": "Letzte 90 Tage",
      "allTime": "Gesamte Zeit",
      "details": "Details",
      "close": "Schließen",
      "earningsActivity": "Einnahmen-Aktivität",
      "noEarningsStartSelling": "Noch keine Einnahmen. Beginnen Sie mit dem Verkauf, um hier Aktivitäten zu sehen."
    },
    "kpi": {
      "revenue": "Umsatz",
      "thisMonth": "Diesen Monat",
      "activeClients": "Aktive Kunden",
      "totalActive": "Gesamt aktiv",
      "upcomingSessions": "Kommende Sitzungen",
      "thisWeek": "Diese Woche",
      "topPerformer": "Top-Performer",
      "noDataYet": "Noch keine Daten",
      "createServiceToStart": "Erstellen Sie einen Service, um loszulegen.",
      "bookings": "Buchungen"
    },
    "reseller": {
      "upcomingEvents": "Kommende Events",
      "next": "Nächste",
      "resellerCode": "Wiederverkäufer-Code",
      "codeCopied": "Wiederverkäufer-Code kopiert!",
      "noSalesYet": "Noch keine Verkäufe",
      "shareLinkToStart": "Teilen Sie einen Link, um zu verdienen.",
      "tickets": "Tickets",
      "shareResellerLink": "Wiederverkäufer-Link teilen",
      "createPromotion": "Promotion erstellen",
      "shareLinkOrPromotion": "Teilen Sie Ihre Wiederverkäufer-Links oder erstellen Sie eine Promotion, um Provisionen zu verdienen.",
      "selectEventToShare": "Event zum Teilen auswählen",
      "pickEventForLink": "Wählen Sie ein Event, um Ihren Wiederverkäufer-Link zu generieren",
      "noEventsToSell": "Keine Events zum Verkauf verfügbar",
      "commission": "Provision",
      "commissionEarned": "Verdiente Provision",
      "inWallet": "Im Wallet",
      "lastPayout": "Letzte Auszahlung",
      "noPayoutsYet": "Noch keine Auszahlungen",
      "attributedSales": "Zugeordnete Verkäufe nach Event",
      "noSalesMatchFilter": "Keine Verkäufe entsprechen den aktuellen Filtern",
      "mockDataActive": "Mock-Daten aktiv"
    },
    "transfer": {
      "title": "An Wallet übertragen",
      "description": "Übertragen Sie Ihre ausstehenden Wiederverkäufer-Provisionen auf Ihr VITANA Wallet.",
      "pending": "Ausstehend",
      "wallet": "Wallet",
      "instantCredit": "Dies wird Ihre Einnahmen sofort auf Ihr Wallet-Guthaben gutschreiben.",
      "transferring": "Wird übertragen...",
      "transfer": "Übertragen"
    }
  },
  "profile": {
    "autopilot": {
      "polishBio": "Bio, Archetyp & Showcase verbessern",
      "try": "Ausprobieren"
    },
    "identity": {
      "vitanaIndex": "Vitana Index",
      "basedOnActivity": "Basierend auf Aktivität, Gesundheitsengagement & Beitrag",
      "viewLongevityId": "Meine Langlebigkeits-ID anzeigen"
    }
  }
}
```

### Phase 2: Refactor Business Hub Earning CTAs (2 files)

**BusinessAcceleratorCenterCTA.tsx:**
```typescript
import { useTranslation } from '@/hooks/useTranslation';

// Inside component:
const { translate } = useTranslation();

const earningOptions: EarningOption[] = [
  {
    id: "create-event",
    icon: <Calendar className="h-6 w-6" />,
    title: translate('business.earning.createEvent'),
    description: translate('business.earning.createEventDesc'),
    action: onCreateEvent,
  },
  // ... similar for other options
];

// JSX updates:
<h2>{translate('business.earning.readyToEarn')}</h2>
<p>{translate('business.earning.choosePathGuide')}</p>
<Button>{translate('business.earning.startEarning')}</Button>
<DialogTitle>{translate('business.earning.howToEarn')}</DialogTitle>
<DialogDescription>{translate('business.earning.pickOne')}</DialogDescription>
```

**MobileEarningPortal.tsx:**
Same pattern with mobile-specific copy keys.

### Phase 3: Refactor Earnings Ledger & Activity (2 files)

**EarningsHistoryLedger.tsx:**
```typescript
const { translate } = useTranslation();

const filters = [
  { value: "all", label: translate('business.history.all') },
  { value: "direct_sale", label: translate('business.history.directSales') },
  { value: "reseller_commission", label: translate('business.history.reseller') },
];

const getDateRangeLabel = (range: string) => {
  switch (range) {
    case "30d": return translate('business.history.last30Days');
    case "7d": return translate('business.history.last7Days');
    case "90d": return translate('business.history.last90Days');
    default: return range;
  }
};

// Empty state:
<p>{translate('business.history.noEarningsYet')}</p>
<p>{translate('business.history.startSellingToSee')}</p>
```

**EarningsActivityFeed.tsx:**
```typescript
const { translate } = useTranslation();

<CardTitle>{translate('business.history.earningsActivity')}</CardTitle>
<Button>{translate('business.history.viewInWallet')}</Button>
// Empty state:
<div>{translate('business.history.noEarningsStartSelling')}</div>
```

### Phase 4: Refactor KPI Cards (2 files)

**BusinessHubKPICards.tsx:**
```typescript
const { translate } = useTranslation();

<p>{translate('business.kpi.revenue')}</p>
<p>{translate('business.kpi.thisMonth')}</p>
<p>{translate('business.kpi.activeClients')}</p>
<p>{translate('business.kpi.totalActive')}</p>
<p>{translate('business.kpi.upcomingSessions')}</p>
<p>{translate('business.kpi.thisWeek')}</p>
<p>{translate('business.kpi.topPerformer')}</p>
<p>{translate('business.kpi.noDataYet')}</p>
<p>{translate('business.kpi.createServiceToStart')}</p>
<span>{stats.topPerformer.bookings} {translate('business.kpi.bookings')}</span>
```

**ResellerHeader.tsx:**
```typescript
const { translate } = useTranslation();

<p>{translate('business.reseller.upcomingEvents')}</p>
<p>{translate('business.reseller.next')}: {format(...)}</p>
<span>{translate('business.reseller.resellerCode')}</span>
<p>{translate('business.kpi.ticketsSold')}</p>
<p>{translate('business.history.last30Days')}</p>
<p>{translate('business.kpi.revenue')}</p>
<p>{translate('business.reseller.topPerformer')}</p>
<p>{translate('business.reseller.noSalesYet')}</p>
<p>{translate('business.reseller.shareLinkToStart')}</p>

// Toast:
toast.success(translate('business.reseller.codeCopied'));
```

### Phase 5: Refactor Reseller Sales Tab & Transfer Dialog (2 files)

**ResellerSalesTab.tsx:**
```typescript
const { translate } = useTranslation();

// Empty state:
<h3>{translate('business.reseller.noSalesYet')}</h3>
<p>{translate('business.reseller.shareLinkOrPromotion')}</p>
<Button>{translate('business.reseller.shareResellerLink')}</Button>
<Button>{translate('business.reseller.createPromotion')}</Button>

// Dialog:
<DialogTitle>{translate('business.reseller.selectEventToShare')}</DialogTitle>
<DialogDescription>{translate('business.reseller.pickEventForLink')}</DialogDescription>
<p>{translate('business.reseller.noEventsToSell')}</p>

// KPI labels:
<p>{translate('business.reseller.commissionEarned')}</p>
<p>{translate('business.history.pendingPayout')}</p>
<p>{translate('business.reseller.inWallet')}</p>
<p>{translate('business.reseller.lastPayout')}</p>
<p>{translate('business.reseller.noPayoutsYet')}</p>

// Time range filters:
const timeRangeOptions = [
  { value: "all", label: translate('business.history.allTime') },
  { value: "30d", label: translate('business.history.last30Days') },
  { value: "7d", label: translate('business.history.last7Days') },
];

<Button>{translate('business.transfer.title')}</Button>
<h3>{translate('business.reseller.attributedSales')}</h3>
<p>{translate('business.reseller.noSalesMatchFilter')}</p>
```

**TransferToWalletDialog.tsx:**
```typescript
const { translate } = useTranslation();

<ResponsiveConfirmDialogTitle>
  {translate('business.transfer.title')}
</ResponsiveConfirmDialogTitle>
<p>{translate('business.transfer.description')}</p>
<p>{translate('business.transfer.pending')}</p>
<p>{translate('business.transfer.wallet')}</p>
<p>{translate('business.transfer.instantCredit')}</p>
<ResponsiveConfirmDialogCancel>{translate('buttons.cancel')}</ResponsiveConfirmDialogCancel>
{isLoading ? translate('business.transfer.transferring') : translate('business.transfer.transfer')}
```

### Phase 6: Refactor Profile Components (2 files)

**MobileAutopilotBanner.tsx:**
```typescript
import { useTranslation } from '@/hooks/useTranslation';

const { translate } = useTranslation();

<p>{translate('profile.autopilot.polishBio')}</p>
<Button>{translate('profile.autopilot.try')}</Button>
```

**MobileIdentityCard.tsx:**
```typescript
import { useTranslation } from '@/hooks/useTranslation';

const { translate } = useTranslation();

<span>{translate('profile.identity.vitanaIndex')}</span>
<p>{translate('profile.identity.basedOnActivity')}</p>
<Button>{translate('profile.identity.viewLongevityId')}</Button>
```

---

## Files to Modify

### Translation Files
| File | Changes |
|------|---------|
| `src/i18n/de.json` | +100 new keys under `business.*` and `profile.*` |
| `src/i18n/en.json` | +100 new keys (English equivalents) |

### Business Hub Components (10 files)
| File | Key Changes |
|------|-------------|
| `src/components/business/BusinessAcceleratorCenterCTA.tsx` | All earning CTA text |
| `src/components/business/MobileEarningPortal.tsx` | Mobile earning portal text |
| `src/components/business/EarningsHistoryLedger.tsx` | Filters, empty states, labels |
| `src/components/business/EarningsActivityFeed.tsx` | Title, filters, empty state |
| `src/components/business/EarningsBySourceCards.tsx` | Card labels |
| `src/components/business/BusinessHubKPICards.tsx` | KPI labels, empty states |
| `src/components/reseller/ResellerHeader.tsx` | KPI labels, toast message |
| `src/components/reseller/ResellerSalesTab.tsx` | Empty states, filters, dialogs, KPI labels |
| `src/components/reseller/TransferToWalletDialog.tsx` | Dialog title, description, buttons |
| `src/components/business/OrganizerEventSalesSheet.tsx` | KPI labels |

### Profile Components (2 files)
| File | Key Changes |
|------|-------------|
| `src/components/profile/mobile/MobileAutopilotBanner.tsx` | Banner text and button |
| `src/components/profile/mobile/MobileIdentityCard.tsx` | Index label and button |

---

## New Translation Key Structure

```text
business/
├── earning/           # Earning portal CTAs
│   ├── readyToEarn
│   ├── choosePathGuide
│   ├── startEarning
│   ├── howToEarn
│   ├── pickOne
│   ├── createEvent / createEventDesc
│   ├── addToInventory / addToInventoryDesc
│   ├── createService / createServiceDesc
│   └── createPromotion / createPromotionDesc
├── history/           # Earnings ledger and activity
│   ├── all / directSales / reseller
│   ├── noEarningsYet / startSellingToSee
│   ├── ticketsSold / grossAmount / youEarned
│   ├── paidToWallet / pendingPayout
│   ├── viewInWallet / transactionId
│   ├── last7Days / last30Days / last90Days / allTime
│   └── earningsActivity / noEarningsStartSelling
├── kpi/               # KPI card labels
│   ├── revenue / thisMonth
│   ├── activeClients / totalActive
│   ├── upcomingSessions / thisWeek
│   ├── topPerformer / noDataYet
│   └── createServiceToStart / bookings
├── reseller/          # Reseller-specific
│   ├── upcomingEvents / next / resellerCode
│   ├── codeCopied / noSalesYet / shareLinkToStart
│   ├── shareResellerLink / createPromotion
│   ├── selectEventToShare / pickEventForLink
│   ├── noEventsToSell / commission
│   ├── commissionEarned / inWallet
│   ├── lastPayout / noPayoutsYet
│   ├── attributedSales / noSalesMatchFilter
│   └── mockDataActive
└── transfer/          # Transfer dialog
    ├── title / description
    ├── pending / wallet
    ├── instantCredit
    └── transferring / transfer

profile/
├── autopilot/
│   ├── polishBio
│   └── try
└── identity/
    ├── vitanaIndex
    ├── basedOnActivity
    └── viewLongevityId
```

---

## Acceptance Criteria Checklist

- [ ] `BusinessAcceleratorCenterCTA.tsx` fully translated
- [ ] `MobileEarningPortal.tsx` fully translated
- [ ] `EarningsHistoryLedger.tsx` fully translated (filters, empty states, labels)
- [ ] `EarningsActivityFeed.tsx` fully translated
- [ ] `BusinessHubKPICards.tsx` fully translated
- [ ] `ResellerHeader.tsx` fully translated (including toast)
- [ ] `ResellerSalesTab.tsx` fully translated
- [ ] `TransferToWalletDialog.tsx` fully translated
- [ ] `MobileAutopilotBanner.tsx` fully translated
- [ ] `MobileIdentityCard.tsx` fully translated
- [ ] Navigate Business Hub with DE selected → zero English UI text
- [ ] Navigate Profile with DE selected → zero English UI text
- [ ] Trigger empty states → zero English system text
- [ ] All toasts display in German when German selected
- [ ] Dev-mode missing key detection remains active (`[[missing:key]]`)
- [ ] Only user-generated content remains in original language

---

## Technical Notes

- **Existing infrastructure**: The `useTranslation()` hook and translation files are already set up with dev-mode `[[missing:key]]` detection
- **Pattern to follow**: Use `translate('key.path', 'English fallback')` for all visible text
- **Toast localization**: Use `translate()` for toast messages, e.g., `toast.success(translate('business.reseller.codeCopied'))`
- **Dynamic content**: For values like amounts, combine: `${translate('business.transfer.transfer')} ${formatCurrency(amount)}`
