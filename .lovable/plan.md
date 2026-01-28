

# Fix Utility Bar Translations — "Search", "Calendar", "Gift Voucher", "Autopilot", "Vitana Index"

## Problem Identified

The action/utility bar components have **hardcoded English strings** and don't use the translation system. The translation keys already exist in the JSON files, but the components simply don't use them.

### Evidence

| Component | Current Code | Translation Key (exists!) |
|-----------|-------------|--------------------------|
| `ExpandableSearchButton.tsx` | `<span>Search</span>` (line 89) | `common.search` = "Suchen" |
| `UniversalCalendarButton.tsx` | `<span>Calendar</span>` (line 50) | ❌ Missing key |
| `GiftVoucherButton.tsx` | `<span>Gift Voucher</span>` (line 17) | ❌ Missing key |
| 10+ page files | `>Autopilot<` hardcoded | `autopilot.title` = "Autopilot" |
| 10+ page files | `>Vitana Index 🧬<` hardcoded | ❌ Missing key |

---

## Solution

### 1. Add Missing Translation Keys

Add to both `de.json` and `en.json`:

```json
"actionBar": {
  "search": "Suchen",          // EN: "Search"
  "calendar": "Kalender",      // EN: "Calendar"
  "giftVoucher": "Gutschein",  // EN: "Gift Voucher"
  "autopilot": "Autopilot",    // Same in both languages
  "vitanaIndex": "Vitana Index" // Same in both languages
}
```

### 2. Refactor Utility Bar Components

**ExpandableSearchButton.tsx** (line 89):
```typescript
// Before
<span className="text-sm">Search</span>

// After
import { useTranslation } from "@/hooks/useTranslation";
const { translate } = useTranslation();
<span className="text-sm">{translate('actionBar.search', 'Search')}</span>
```

**UniversalCalendarButton.tsx** (line 50):
```typescript
// Before
{showText && <span className="text-sm">Calendar</span>}

// After
import { useTranslation } from "@/hooks/useTranslation";
const { translate } = useTranslation();
{showText && <span className="text-sm">{translate('actionBar.calendar', 'Calendar')}</span>}
```

**GiftVoucherButton.tsx** (line 17):
```typescript
// Before
<span className="text-sm">Gift Voucher</span>

// After
import { useTranslation } from "@/hooks/useTranslation";
const { translate } = useTranslation();
<span className="text-sm">{translate('actionBar.giftVoucher', 'Gift Voucher')}</span>
```

### 3. Refactor Page-Level Autopilot & Vitana Index Buttons

The following pages have inline "Autopilot" and "Vitana Index 🧬" buttons that need translation:

| File | Lines to Update |
|------|-----------------|
| `src/pages/Messages.tsx` | Autopilot + Vitana Index buttons |
| `src/pages/BusinessHub.tsx` | Autopilot + Vitana Index buttons |
| `src/pages/Wallet.tsx` | Autopilot + Vitana Index buttons |
| `src/pages/Discover.tsx` | Autopilot + Vitana Index buttons |
| `src/pages/community/EventsAndMeetups.tsx` | Autopilot + Vitana Index buttons |
| `src/pages/community/LiveRooms.tsx` | Autopilot + Vitana Index buttons |
| `src/pages/community/MediaHub.tsx` | Autopilot + Vitana Index buttons |
| `src/components/orders/MobileOrdersView.tsx` | Autopilot button |

Pattern for each:
```typescript
// Before
>Autopilot<

// After
>{translate('actionBar.autopilot', 'Autopilot')}<
```

```typescript
// Before
>Vitana Index 🧬<

// After
>{translate('actionBar.vitanaIndex', 'Vitana Index')} 🧬<
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/i18n/de.json` | Add `actionBar` section |
| `src/i18n/en.json` | Add `actionBar` section |
| `src/components/ui/expandable-search-button.tsx` | Add `useTranslation`, translate "Search" |
| `src/components/UniversalCalendarButton.tsx` | Add `useTranslation`, translate "Calendar" |
| `src/components/voucher/GiftVoucherButton.tsx` | Add `useTranslation`, translate "Gift Voucher" |
| `src/pages/Messages.tsx` | Translate Autopilot + Vitana Index |
| `src/pages/BusinessHub.tsx` | Translate Autopilot + Vitana Index |
| `src/pages/Wallet.tsx` | Translate Autopilot + Vitana Index |
| `src/pages/Discover.tsx` | Translate Autopilot + Vitana Index |
| `src/pages/community/EventsAndMeetups.tsx` | Translate Autopilot + Vitana Index |
| `src/pages/community/LiveRooms.tsx` | Translate Autopilot + Vitana Index |
| `src/pages/community/MediaHub.tsx` | Translate Autopilot + Vitana Index |
| `src/components/orders/MobileOrdersView.tsx` | Translate Autopilot |

---

## German Translations

| Key | German | English |
|-----|--------|---------|
| `actionBar.search` | Suchen | Search |
| `actionBar.calendar` | Kalender | Calendar |
| `actionBar.giftVoucher` | Gutschein | Gift Voucher |
| `actionBar.autopilot` | Autopilot | Autopilot |
| `actionBar.vitanaIndex` | Vitana Index | Vitana Index |

---

## Result

After implementation:
- ✅ Search button shows "Suchen" in German
- ✅ Calendar button shows "Kalender" in German  
- ✅ Gift Voucher button shows "Gutschein" in German
- ✅ Autopilot remains "Autopilot" (brand name)
- ✅ Vitana Index remains "Vitana Index" (brand name)
- ✅ All utility bar text responds to language switching instantly

