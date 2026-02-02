

## Fix Orders Screen Translation Keys - Duplicate Namespace Consolidation

### Problem Summary

The Orders screen on mobile shows raw translation keys like `orders.myOrders`, `orders.trackDescription`, `orders.tabs.history`, `orders.emptyActive.title`, etc. instead of translated text. This looks unprofessional and unfinished.

### Root Cause

Both `de.json` and `en.json` contain **two separate `"orders":` blocks**:

| Block | Location | Contains |
|-------|----------|----------|
| First (correct) | Lines 2-68 | All keys used by MobileOrdersView: `myOrders`, `trackDescription`, `tabs.active`, `tabs.history`, `emptyActive`, `emptyHistory`, `browseProducts`, `findEvents`, `sampleData`, `previewNotice`, `detailSheet`, `status`, etc. |
| Second (overwrites) | Lines 714-739 | Simpler structure with `title`, `description`, `noOrders`, `status` (different structure), `viewDetails`, `trackOrder`, `reorder` |

**JSON "last-key-wins" behavior**: When a JSON file has duplicate keys, JavaScript's `JSON.parse()` keeps only the last occurrence. So the second `orders` block (lines 714-739) completely replaces the first one, causing all the mobile-specific translations to be lost.

### Visual Evidence

From the screenshots:
- Title shows: `orders.myOrders` instead of "Meine Bestellungen"
- Description shows: `orders.trackDescription` instead of "Verfolgen Sie Ihre Produktbestellungen..."
- Tab shows: `orders.tabs.history (3)` instead of "Verlauf (3)"
- Empty state shows: `orders.emptyActive.title` and `orders.emptyActive.description`
- Buttons show: `orders.findEvents` instead of "Events entdecken"

### Solution

**Merge both `orders` blocks into a single unified namespace** by:
1. Keeping all keys from the first block (lines 2-68) - these are the complete, mobile-optimized translations
2. Adding any unique keys from the second block (lines 714-739) that aren't already in the first
3. Deleting the duplicate second block

### Keys to Merge

The second block has these keys that should be added to the first block (if not already present):

| Key | German | English |
|-----|--------|---------|
| `title` | Bestellungen | Orders |
| `description` | Ihre Bestellhistorie und aktive Abonnements | Your order history and active subscriptions |
| `tabs.all` | Alle | All |
| `tabs.completed` | Abgeschlossen | Completed |
| `tabs.cancelled` | Storniert | Cancelled |
| `noOrders` | Noch keine Bestellungen | No orders yet |
| `noOrdersDesc` | Ihre Bestellungen werden hier erscheinen... | Your orders will appear here... |
| `orderDate` | Bestelldatum | Order date |
| `orderNumber` | Bestellnummer | Order number |
| `viewDetails` | Details anzeigen | View Details |
| `trackOrder` | Bestellung verfolgen | Track Order |
| `reorder` | Erneut bestellen | Reorder |

Note: `status` keys overlap - the first block has more complete status translations, so we keep those and add any missing ones from the second block.

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | Merge keys from second `orders` block (714-739) into first block (2-68), then delete lines 714-739 |
| `src/i18n/en.json` | Same: merge second block into first, delete duplicate |

---

## Technical Details

### Before (Broken Structure)

```json
{
  "orders": {           // Lines 2-68 - FIRST BLOCK (gets overwritten)
    "myOrders": "Meine Bestellungen",
    "trackDescription": "...",
    "tabs": { "active": "Aktiv", "history": "Verlauf" },
    "emptyActive": { "title": "...", "description": "..." },
    ...
  },
  "voucher": { ... },
  // ... hundreds of other keys ...
  "orders": {           // Lines 714-739 - SECOND BLOCK (wins, overwrites first)
    "title": "Bestellungen",
    "tabs": { "all": "Alle", "active": "Aktiv", "completed": "..." },
    ...
  },
  "vitanaIndex": { ... }
}
```

### After (Fixed Structure)

```json
{
  "orders": {           // Single unified block
    "myOrders": "Meine Bestellungen",
    "trackDescription": "Verfolgen Sie Ihre Produktbestellungen...",
    "title": "Bestellungen",                          // Added from second block
    "description": "Ihre Bestellhistorie...",          // Added from second block
    "searchPlaceholder": "Bestellungen suchen...",
    "tabs": {
      "active": "Aktiv",
      "history": "Verlauf",
      "all": "Alle",                                   // Added from second block
      "completed": "Abgeschlossen",                    // Added from second block
      "cancelled": "Storniert"                         // Added from second block
    },
    "emptyActive": { "title": "...", "description": "..." },
    "emptyHistory": { "title": "...", "description": "..." },
    "noOrders": "Noch keine Bestellungen",             // Added from second block
    "noOrdersDesc": "...",                             // Added from second block
    "browseProducts": "Produkte durchsuchen",
    "findEvents": "Events entdecken",
    "sampleData": "Beispieldaten",
    "previewNotice": "Dies sind Vorschau-Bestellungen...",
    "detailSheet": { ... },
    "status": { ... },                                 // Merged status keys
    "orderDate": "Bestelldatum",                       // Added from second block
    "orderNumber": "Bestellnummer",                    // Added from second block
    "viewDetails": "Details anzeigen",                 // Added from second block
    "trackOrder": "Bestellung verfolgen",              // Added from second block
    "reorder": "Erneut bestellen"                      // Added from second block
  },
  "voucher": { ... },
  // ... other keys ...
  // NO SECOND "orders" block - deleted
  "vitanaIndex": { ... }
}
```

### Implementation Steps

1. **Read the full first `orders` block** (lines 2-68) to get all existing keys
2. **Read the second `orders` block** (lines 714-739) to identify unique keys to add
3. **Merge unique keys** from second block into first block
4. **Delete the second `orders` block** entirely
5. **Repeat for en.json**

### Result

After this fix:
- "orders.myOrders" will resolve to "Meine Bestellungen" (DE) / "My Orders" (EN)
- "orders.trackDescription" will resolve to proper description
- "orders.tabs.history" will resolve to "Verlauf" (DE) / "History" (EN)
- All empty states and buttons will show translated text
- The Orders screen will look polished and complete

