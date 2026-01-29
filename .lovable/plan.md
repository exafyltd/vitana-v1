

## Localize Business Hub "Create" Popup (BusinessTypeSelector)

### What's Happening

When you click **+ Erstellen** in Business Hub, the `BusinessTypeSelector` popup opens with all content in English:

- Dialog title: "Start a Business"
- Card titles: "Create Event", "Offer Service", "Sell Event Tickets"
- Subtitles describing each option
- Badge text: "New", "Active"
- Status messages and Cancel button

This component (`src/components/business/BusinessTypeSelector.tsx`) does not use `useTranslation()` and has all strings hardcoded.

### Implementation Plan

#### Step 1: Add Translation Keys

Add new keys under `business.typeSelector.*` namespace in the final `business` block (around line 1454) to avoid the duplicate key issue.

**Keys to add:**

| Key | German | English |
|-----|--------|---------|
| `typeSelector.title` | Ein Geschäft starten | Start a Business |
| `typeSelector.createEvent` | Event erstellen | Create Event |
| `typeSelector.createEventDesc` | Workshops, Kurse oder Veranstaltungen ausrichten | Host workshops, classes, or gatherings |
| `typeSelector.offerService` | Service anbieten | Offer Service |
| `typeSelector.offerServiceDesc` | 1-zu-1 Beratungen, Coaching, Sitzungen | 1-on-1 consultations, coaching, sessions |
| `typeSelector.sellTickets` | Event-Tickets verkaufen | Sell Event Tickets |
| `typeSelector.sellTicketsDesc` | Events bewerben und Provisionen verdienen | Promote events and earn commissions |
| `typeSelector.badgeNew` | Neu | New |
| `typeSelector.badgeActive` | Aktiv | Active |
| `typeSelector.alreadyReseller` | Sie sind bereits Wiederverkäufer! Schauen Sie im Tab "Verkaufen & Verdienen" nach. | You're already a reseller! Check the Sell & Earn tab. |
| `typeSelector.cancel` | Abbrechen | Cancel |

#### Step 2: Update BusinessTypeSelector Component

Refactor `src/components/business/BusinessTypeSelector.tsx`:

1. Import `useTranslation` hook
2. Refactor `BUSINESS_TYPES` array to use stable IDs for logic, translated labels for display
3. Replace all hardcoded strings with `translate(...)` calls
4. Keep click handlers and business logic unchanged

**Current structure (hardcoded):**
```typescript
const BUSINESS_TYPES = [
  {
    id: "event",
    title: "Create Event",  // ← hardcoded
    subtitle: "Host workshops, classes, or gatherings",  // ← hardcoded
    ...
  },
```

**New structure (translated):**
```typescript
// Move inside component to access translate()
const getBusinessTypes = () => [
  {
    id: "event",
    title: translate('business.typeSelector.createEvent', 'Create Event'),
    subtitle: translate('business.typeSelector.createEventDesc', '...'),
    ...
  },
```

#### Step 3: Fix Duplicate `business` Keys in JSON Files

The translation files have duplicate `"business":` keys (at lines ~1242 and ~1454). Following the established namespace integrity rule, merge the `kpi` block from line 1242 into the final `business` block at line 1454, then delete the orphaned block.

**Files to modify:**
- `src/i18n/de.json`
- `src/i18n/en.json`
- `src/components/business/BusinessTypeSelector.tsx`

### Scope Note

The `CreateServicePopup` component (which opens after selecting "Offer Service") also contains ~50+ hardcoded English strings (service types, form labels, buttons, toasts, etc.). That's a larger localization task that can be done as a follow-up if you want. This plan focuses on the initial selector popup you reported.

### Verification Steps

1. Set language to German
2. Go to Business Hub → tap **+ Erstellen**
3. Popup should display:
   - "Ein Geschäft starten" as title
   - All three cards in German
   - "Abbrechen" button
4. If already a reseller, the Sell Tickets card should show German status message
5. Switch to English and confirm it flips back

### Technical Details

**Safe refactoring pattern for BUSINESS_TYPES:**

```typescript
export function BusinessTypeSelector({ ... }) {
  const { translate } = useTranslation();
  
  // Build translated array inside component
  const businessTypes = [
    {
      id: "event",  // stable ID for logic
      icon: Calendar,
      title: translate('business.typeSelector.createEvent', 'Create Event'),
      subtitle: translate('business.typeSelector.createEventDesc', '...'),
      ...
    },
    // ... other types
  ];
  
  // Rest of component logic unchanged
}
```

This ensures:
- Stable IDs for switch/case logic
- Dynamic translation on language change
- No breaking changes to existing functionality

