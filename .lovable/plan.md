

## Localize Orders Page and Gift Voucher Modal (MAXINA)

### Problem Analysis

From the screenshot and code analysis, there are **three areas** with hardcoded English strings:

| Component | Issues Found |
|-----------|--------------|
| Orders Page (`Orders.tsx`) | "My Orders", "Track your product orders...", tab labels, empty states, buttons |
| Mobile Orders View (`MobileOrdersView.tsx`) | Same header, tabs ("Active", "History"), empty states, search placeholder |
| Gift Voucher Modal (`MaxinaVoucherModal.tsx`) | ~60+ strings: tier names, benefits, form labels, success messages, button text |
| Order Detail Sheet (`MobileOrderDetailSheet.tsx`) | "Order Details", "Gift Voucher", form labels, action buttons |

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | Add ~80 new translation keys |
| `src/i18n/en.json` | Mirror all new keys in English |
| `src/pages/discover/Orders.tsx` | Use `translate()` for all strings |
| `src/components/orders/MobileOrdersView.tsx` | Use `translate()` for all strings |
| `src/components/orders/MobileOrderDetailSheet.tsx` | Full localization |
| `src/components/voucher/MaxinaVoucherModal.tsx` | Full localization |

### Implementation Plan

#### Step 1: Expand Translation Keys

**Orders Namespace (`orders.*`):**

```
orders.myOrders = "Meine Bestellungen" / "My Orders"
orders.trackDescription = "Verfolgen Sie Ihre Produktbestellungen und Event-Tickets" / "Track your product orders and event tickets"
orders.searchPlaceholder = "Bestellungen suchen..." / "Search orders..."
orders.tabs.active = "Aktiv" / "Active"
orders.tabs.history = "Verlauf" / "History"
orders.previewNotice = "Dies sind Vorschau-Bestellungen. Ihre tatsächlichen Bestellungen erscheinen hier."
orders.emptyActive.title = "Keine aktiven Bestellungen"
orders.emptyActive.description = "Sie haben keine aktiven Bestellungen oder anstehenden Events."
orders.emptyHistory.title = "Kein Bestellverlauf"
orders.emptyHistory.description = "Ihre abgeschlossenen Bestellungen und vergangenen Events erscheinen hier."
orders.browseProducts = "Produkte durchsuchen"
orders.findEvents = "Events entdecken"
orders.startShopping = "Einkaufen starten"
orders.sampleData = "Beispieldaten"
orders.detailSheet.title = "Bestelldetails"
orders.detailSheet.orderInfo = "Bestellinfo"
orders.detailSheet.orderReference = "Bestellreferenz"
orders.detailSheet.purchaseDate = "Kaufdatum"
orders.detailSheet.eventDate = "Event-Datum"
orders.detailSheet.location = "Ort"
orders.detailSheet.quantity = "Menge"
orders.detailSheet.tickets = "Tickets"
orders.detailSheet.yourTicket = "Ihr Ticket"
orders.detailSheet.giftVoucher = "Geschenkgutschein"
orders.detailSheet.code = "Code"
orders.detailSheet.sendToRecipient = "An Empfänger senden"
orders.detailSheet.recipientEmail = "Empfänger-E-Mail *"
orders.detailSheet.recipientName = "Empfängername"
orders.detailSheet.personalMessage = "Persönliche Nachricht"
orders.detailSheet.cancel = "Abbrechen"
orders.detailSheet.send = "Senden"
orders.detailSheet.downloadPdf = "PDF herunterladen"
```

**Voucher Modal Namespace (`voucher.*`):**

```
voucher.modal.title = "Maxina Gutschein verschenken"
voucher.modal.subtitle = "Verschenken Sie Wellness und Community-Verbindung"
voucher.tiers.test.name = "Test"
voucher.tiers.test.benefits.0 = "Nur für Zahlungstest"
voucher.tiers.test.benefits.1 = "Kein echter Gutschein"
voucher.tiers.test.benefits.2 = "Für Entwicklungstests"
voucher.tiers.experience.name = "Erlebnis"
voucher.tiers.experience.benefits.0 = "1 Premium-Community-Event-Zugang"
voucher.tiers.experience.benefits.1 = "Personalisierte Wellness-Beratung"
voucher.tiers.experience.benefits.2 = "30-Tage Vitana+ Testversion inklusive"
voucher.tiers.experience.benefits.3 = "Wunderschön gestalteter E-Gutschein"
voucher.tiers.exclusive.name = "Exklusiv"
voucher.tiers.exclusive.benefits.0 = "3 Premium-Community-Events"
voucher.tiers.exclusive.benefits.1 = "1-zu-1 Experten-Coaching"
voucher.tiers.exclusive.benefits.2 = "90-Tage Vitana+ Abonnement"
voucher.tiers.exclusive.benefits.3 = "Prioritätsbuchung + VIP-Vorteile"
voucher.modal.buyVoucher = "Gutschein kaufen"
voucher.modal.openingCheckout = "Sicheren Checkout öffnen..."
voucher.success.title = "Gutschein gekauft!"
voucher.success.ready = "Ihr {tier} Gutschein ist bereit"
voucher.success.download = "Gutschein herunterladen"
voucher.success.sendEmail = "Per E-Mail an Empfänger senden"
voucher.success.viewOrders = "In Bestellungen anzeigen"
voucher.success.done = "Fertig"
voucher.email.title = "Gutschein per E-Mail senden"
voucher.email.subtitle = "Wir senden eine schön gestaltete E-Mail mit dem Gutschein"
voucher.email.recipientEmail = "Empfänger-E-Mail *"
voucher.email.recipientName = "Empfängername (optional)"
voucher.email.personalMessage = "Persönliche Nachricht (optional)"
voucher.email.messagePlaceholder = "Alles Gute zum Geburtstag! Genieße dieses Wellness-Geschenk..."
voucher.email.back = "Zurück"
voucher.email.send = "Gutschein senden"
voucher.preview.title = "Ihr Gutschein"
voucher.preview.giftVoucher = "Geschenkgutschein"
voucher.preview.validUntil = "Gültig bis {date}"
voucher.preview.voucherCode = "Gutschein-Code"
voucher.preview.whatsIncluded = "Was enthalten ist"
voucher.preview.downloadPdf = "PDF herunterladen"
voucher.preview.downloadDirect = "Direkt herunterladen"
voucher.preview.openInBrowser = "Im Browser öffnen"
voucher.preview.copyLink = "Link kopieren"
voucher.preview.share = "Teilen"
voucher.toast.downloadStarted = "Download gestartet!"
voucher.toast.downloadFailed = "Download fehlgeschlagen"
voucher.toast.linkCopied = "Link kopiert!"
voucher.toast.linkCopiedDesc = "Im Browser einfügen zum Herunterladen."
voucher.toast.voucherSent = "Gutschein an {email} gesendet!"
voucher.toast.voucherShared = "Gutschein erfolgreich geteilt!"
voucher.toast.checkoutFailed = "Checkout konnte nicht gestartet werden. Bitte erneut versuchen."
```

#### Step 2: Update Orders.tsx (Desktop)

Replace all hardcoded strings:

```tsx
// BEFORE
<StandardHeader
  title="My Orders"
  description="Track your product orders and event tickets"
  emoji="📦"
/>

// AFTER
<StandardHeader
  title={translate('orders.myOrders')}
  description={translate('orders.trackDescription')}
  emoji="📦"
/>
```

Update tabs, empty states, buttons with `translate()` calls.

#### Step 3: Update MobileOrdersView.tsx

```tsx
// BEFORE
<h1 className="text-xl font-bold">My Orders 📦</h1>
<p className="text-sm">Track your product orders and event tickets</p>

// AFTER
<h1 className="text-xl font-bold">{translate('orders.myOrders')} 📦</h1>
<p className="text-sm">{translate('orders.trackDescription')}</p>
```

Update tabs, empty states, search placeholder.

#### Step 4: Update MobileOrderDetailSheet.tsx

Import `useTranslation()` and replace:
- "Order Details" → `translate('orders.detailSheet.title')`
- "Order Info" → `translate('orders.detailSheet.orderInfo')`
- "Gift Voucher" → `translate('orders.detailSheet.giftVoucher')`
- All form labels and buttons

#### Step 5: Update MaxinaVoucherModal.tsx

This is the largest change. Import `useTranslation()` and refactor:

```tsx
// Tier data with translation keys
const getTierData = (translate: TranslateFn) => ({
  test: {
    name: translate('voucher.tiers.test.name'),
    price: 0.49,
    icon: Gift,
    color: "from-green-500 to-emerald-600",
    benefits: [
      translate('voucher.tiers.test.benefits.0'),
      translate('voucher.tiers.test.benefits.1'),
      translate('voucher.tiers.test.benefits.2')
    ]
  },
  // ... experience and exclusive tiers
});
```

Replace all modal state strings, button text, and toast messages.

### Translation Summary (German)

| Key | German Value |
|-----|--------------|
| `orders.myOrders` | Meine Bestellungen |
| `orders.trackDescription` | Verfolgen Sie Ihre Produktbestellungen und Event-Tickets |
| `orders.tabs.active` | Aktiv |
| `orders.tabs.history` | Verlauf |
| `orders.emptyActive.title` | Keine aktiven Bestellungen |
| `voucher.modal.title` | Maxina Gutschein verschenken |
| `voucher.modal.buyVoucher` | Gutschein kaufen |
| `voucher.success.title` | Gutschein gekauft! |
| `voucher.success.download` | Gutschein herunterladen |
| `voucher.email.title` | Gutschein per E-Mail senden |
| `voucher.tiers.experience.name` | Erlebnis |
| `voucher.tiers.exclusive.name` | Exklusiv |
| ... and ~70 more keys |

### Technical Notes

- Tier benefits use array indexing (`benefits.0`, `benefits.1`, etc.) for dynamic benefit lists
- Toast messages use `sonner` directly with translated strings
- Form placeholders need translation (e.g., "friend@example.com" stays as-is since it's a format hint)
- Keep the email format hint `friend@example.com` untranslated (universal format)

### Verification Steps

1. Set language to German
2. Navigate to Discover → Orders
3. Confirm:
   - Title: "Meine Bestellungen 📦"
   - Description: "Verfolgen Sie Ihre Produktbestellungen und Event-Tickets"
   - Tabs: "Aktiv (X)" / "Verlauf (X)"
   - Empty states in German
4. Tap "Gutschein" button in utility bar
5. Gift Voucher modal should show:
   - "Maxina Gutschein verschenken"
   - Tier names in German
   - Benefits in German
   - "Gutschein kaufen" button
6. (After purchase) Success screen in German
7. Email form in German
8. Order Detail Sheet in German

