
## Internationalize Mobile KPI Strip Labels

### Problem
The mobile Business/Wallet page shows KPI card labels in English ("Total Earnings", "Last 30 Days", "Pending", "In Wallet") even when German is the selected language.

### Root Cause
The `MobileKPIStrip.tsx` component uses hardcoded English strings instead of the translation system. The desktop `UnifiedEarningsKPIStrip.tsx` already does this correctly.

### Solution
Update `MobileKPIStrip.tsx` to use the `useTranslation` hook with the existing translation keys.

---

### Changes

**File:** `src/components/business/MobileKPIStrip.tsx`

1. **Add import** for the translation hook:
   ```typescript
   import { useTranslation } from "@/hooks/useTranslation";
   ```

2. **Use translate()** in the component function:
   ```typescript
   export function MobileKPIStrip(...) {
     const navigate = useNavigate();
     const { translate } = useTranslation();  // ADD
   ```

3. **Replace hardcoded labels** with translation keys:

| Current (hardcoded) | Updated (translated) |
|---------------------|---------------------|
| `label: "Total Earnings"` | `label: translate('business.kpi.totalEarnings')` |
| `label: "Last 30 Days"` | `label: translate('business.kpi.last30Days')` |
| `label: "Pending"` | `label: translate('business.kpi.pendingPayout')` |
| `label: "In Wallet"` | `label: translate('business.kpi.inWallet')` |

---

### Existing Translations (already in place)

**German (`de.json`):**
- `business.kpi.totalEarnings` → "Gesamteinnahmen"
- `business.kpi.last30Days` → "Letzte 30 Tage"
- `business.kpi.pendingPayout` → "Ausstehende Auszahlung"
- `business.kpi.inWallet` → "Im Wallet"

**English (`en.json`):**
- `business.kpi.totalEarnings` → "Total Earnings"
- `business.kpi.last30Days` → "Last 30 Days"
- `business.kpi.pendingPayout` → "Pending Payout"
- `business.kpi.inWallet` → "In Wallet"

---

### Result
When German is selected, the mobile KPI cards will display:
- "Gesamteinnahmen" instead of "Total Earnings"
- "Letzte 30 Tage" instead of "Last 30 Days"
- "Ausstehende Auszahlung" instead of "Pending"
- "Im Wallet" instead of "In Wallet"
