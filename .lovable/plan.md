

## Fix: BusinessTypeSelector Still Showing English

### Issue Analysis

The component code and translation keys I added earlier are correct:
- `src/components/business/BusinessTypeSelector.tsx` uses `translate('business.typeSelector.*')` pattern
- `src/i18n/de.json` has German translations at lines 1546-1558
- `src/i18n/en.json` has English translations at lines 1546-1558

However, there's still a **duplicate `"business":` key problem** that needs to be fixed:

| Location | Block Contains |
|----------|----------------|
| Line 1242 | `kpi` only |
| Line 1454 | `earning`, `sellAndEarn`, `transfer`, `typeSelector` |

JSON's last-key-wins means only the line 1454 block is used. The `kpi` translations at line 1242 are silently ignored.

### Solution

Merge the `kpi` block from line 1242 into the main `business` block at line 1454, then delete the orphaned block. This follows the established namespace integrity rule.

### Implementation

#### Step 1: Update `src/i18n/de.json`

1. Add `kpi` block into the main `business` object at line 1454:

```json
"business": {
  "kpi": {
    "totalEarnings": "Gesamteinnahmen",
    "last30Days": "Letzte 30 Tage",
    "pendingPayout": "Ausstehende Auszahlung",
    "inWallet": "Im Wallet"
  },
  "earning": { ... },
  "sellAndEarn": { ... },
  "transfer": { ... },
  "typeSelector": { ... }
}
```

2. Delete the orphaned `business` block at lines 1242-1249

#### Step 2: Update `src/i18n/en.json`

Same approach - merge `kpi` into the main `business` block and delete the duplicate.

### Files to Modify

| File | Change |
|------|--------|
| `src/i18n/de.json` | Merge `kpi` into main `business` block, delete orphan at line 1242 |
| `src/i18n/en.json` | Merge `kpi` into main `business` block, delete orphan at line 1242 |

### Expected Result

After this fix:
1. No duplicate `"business":` keys in JSON files
2. All `business.*` translation lookups work correctly
3. `business.kpi.*` keys preserved for any components using them
4. `business.typeSelector.*` continues working as intended
5. Preview refresh will show German text in the popup

### Verification

1. Set language to German
2. Go to Business Hub → tap **+ Erstellen**  
3. Popup should display:
   - "Ein Geschäft starten" as title
   - "Event erstellen", "Service anbieten", "Event-Tickets verkaufen"
   - "Abbrechen" button
4. Switch to English and confirm English text appears

