

## Fix Mobile Connected Apps Utility Action Bar

### Problem Summary

The Mobile Connected Apps screen is missing standard action bar components that appear on other mobile hubs:

| Missing Component | Status |
|-------------------|--------|
| 📅 **Calendar** button (`UniversalCalendarButton`) | Not included |
| 🎁 **Gift Voucher** button | Explicitly hidden with `hideGiftVoucher` |
| 🧬 **Vitana Index** chip | Not included in `afterGiftVoucherChildren` |
| ✈️ **Autopilot** chip | Not included in `afterGiftVoucherChildren` |
| ➕ **"App hinzufügen" button** | onClick handler is empty (does nothing) |

The current implementation at line 54-70 of `MobileConnectedAppsView.tsx` has:
- `hideGiftVoucher` set to `true`
- No `afterGiftVoucherChildren` prop
- No `UniversalCalendarButton`
- Empty onClick for the "Add App" button

---

## Solution

Update `MobileConnectedAppsView.tsx` to match the standard mobile hub pattern used in `MobileOrdersView.tsx` (lines 250-297):

1. **Remove** `hideGiftVoucher` prop (let Gift Voucher button appear)
2. **Add** `UniversalCalendarButton` in children
3. **Add** `afterGiftVoucherChildren` with `VitanaIndexChip` and `AutopilotChip`
4. **Wire** the "Add App" button to open a bottom sheet or the existing `ConnectAppPopup`

---

## Technical Implementation

### Current Code (Lines 53-70)
```tsx
{/* Action Bar */}
<UtilityActionButton hideGiftVoucher>
  <ExpandableSearchButton
    placeholder={translate('connectedApps.searchPlaceholder')}
    onSearch={setSearchQuery}
  />
  <Button
    variant="soft"
    size="xs"
    className="shrink-0"
    onClick={() => {
      // Could open a connect popup in the future
    }}
  >
    <Plus className="h-4 w-4 mr-1" />
    {translate('connectedApps.addApp')}
  </Button>
</UtilityActionButton>
```

### Updated Code
```tsx
{/* Action Bar */}
<UtilityActionButton
  afterGiftVoucherChildren={
    <>
      <VitanaIndexChip />
      <AutopilotChip 
        pendingCount={0} 
        onClick={() => setAutopilotOpen(true)} 
      />
    </>
  }
>
  <div className="flex items-center gap-2 min-w-max">
    <ExpandableSearchButton
      placeholder={translate('connectedApps.searchPlaceholder')}
      onSearch={setSearchQuery}
    />
    <UniversalCalendarButton />
    <Button
      variant="ghost"
      size="sm"
      className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
      onClick={() => setConnectPopupOpen(true)}
    >
      <Plus className="h-4 w-4" />
      {translate('connectedApps.addApp')}
    </Button>
  </div>
</UtilityActionButton>

{/* Connect App Popup */}
<ConnectAppPopup 
  isOpen={connectPopupOpen} 
  onClose={() => setConnectPopupOpen(false)} 
/>

{/* Autopilot Popup */}
<AutopilotPopup 
  open={autopilotOpen} 
  onOpenChange={setAutopilotOpen} 
/>
```

---

## Required Imports to Add

```tsx
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { VitanaIndexChip, AutopilotChip } from "@/components/mobile/MobileActionChips";
import { ConnectAppPopup } from "@/components/ConnectAppPopup";
import { AutopilotPopup } from "@/components/AutopilotPopup";
```

---

## State to Add

```tsx
const [connectPopupOpen, setConnectPopupOpen] = useState(false);
const [autopilotOpen, setAutopilotOpen] = useState(false);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/settings/MobileConnectedAppsView.tsx` | Add missing imports, state, action bar components, and popup modals |

---

## Visual Result

After this fix, the Mobile Connected Apps utility action bar will display:

```text
[🔍 Suchen] [📅 Calendar] [+ App hinzufügen] [🎁 Gift] [🧬 742] [✈️ Autopilot]
```

This matches the pattern used across other VITANA mobile hubs (Orders, Events, Media Hub, Business Hub).

---

## Button Styling Consistency

The "Add App" button will use the same styling as other primary action buttons in mobile hubs:
- `h-9` height (matches other pills)
- `rounded-full` border radius
- `bg-primary text-primary-foreground` for primary action emphasis
- `px-3` horizontal padding
- `gap-1.5` icon-text spacing

