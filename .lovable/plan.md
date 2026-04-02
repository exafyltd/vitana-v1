

# Hierarchical Mode Pill with Sub-Categories for Business Hub

## Problem

The current `MobileModePill` bottom sheet shows flat top-level modes (Snapshot, Services, Sales, Insights). But Services, Sales, and Insights each have their own internal sub-tabs. The user wants the sheet to show expandable dropdown arrows next to these categories, revealing their sub-items inline. Selecting a sub-item should navigate directly to that specific screen — no secondary tab row needed.

## Approach

### 1. Extend `MobileModePill` to support hierarchical modes

Update `ModeOption` to include optional `children`:

```ts
export interface ModeOption {
  value: string;
  label: string;
  icon?: string;
  badge?: number;
  children?: ModeOption[]; // sub-categories
}
```

In the bottom sheet:
- Modes **without** children behave as before (tap → select, close)
- Modes **with** children show a chevron-down arrow by the label; tapping toggles an expand/collapse of child items indented below
- Tapping a child item sets `activeMode` to `"parent.child"` format (e.g. `"services.events"`) and closes the sheet
- The pill button label shows the deepest selected label (e.g. "📅 My Events" instead of "💼 Services")

### 2. Update Business Hub modes config

```ts
modes={[
  { value: "snapshot", label: "Snapshot", icon: "📊" },
  { value: "services", label: "Services", icon: "💼", children: [
    { value: "services.services", label: "My Services", icon: "💼" },
    { value: "services.events", label: "My Events", icon: "📅" },
    { value: "services.packages", label: "Packages", icon: "📦" },
  ]},
  ...(isReseller ? [{ value: "sales", label: "Sales", icon: "🎫", children: [
    { value: "sales.inventory", label: "Inventory", icon: "🎫" },
    { value: "sales.promotions", label: "Promotions", icon: "📣" },
  ]}] : []),
  { value: "insights", label: "Insights", icon: "📈", children: [
    { value: "insights.clients", label: "Clients", icon: "👥" },
    { value: "insights.performance", label: "Performance", icon: "📊" },
    { value: "insights.earnings", label: "Earnings", icon: "💵" },
    { value: "insights.growth", label: "Growth", icon: "📈" },
  ]},
]}
```

### 3. Update Business Hub content rendering

Instead of rendering `ServicesSubTabs` (which has its own SplitBar), render the specific sub-content directly based on `mobileTab`:

- `"services.services"` → Services empty state / list
- `"services.events"` → `OrganizerEventsSection`
- `"services.packages"` → Package cards
- `"sales.inventory"` → `ResellerAvailableEventsTab`
- `"sales.promotions"` → `ResellerCampaignsTab`
- `"insights.clients"` → `ClientsSubTabs`
- `"insights.performance"` → Performance card
- `"insights.earnings"` → Earnings card
- `"insights.growth"` → Growth card

This eliminates the secondary sub-tab row entirely on mobile — the user picks the exact screen from the hierarchical sheet.

### 4. Remove secondary SplitBarList rows on mobile

The `ServicesSubTabs`, `SellAndEarnSubTabs`, and `AnalyticsSubTabs` components each render their own `SplitBarList`. On mobile, these will be bypassed since BusinessHub renders the specific sub-content directly. The sub-tab components remain unchanged for desktop use.

## Files Changed

1. **`src/components/ui/MobileModePill.tsx`** — Add `children` support to `ModeOption`, expandable sections in the sheet
2. **`src/pages/BusinessHub.tsx`** — Update modes config with children, replace `SplitBarContent` blocks with granular sub-content rendering based on dot-notation `mobileTab` value

## Visual Reference

The bottom sheet will look like:

```text
Select Mode
───────────────────────
📊  Snapshot
💼  Services            ▾
    💼  My Services
    📅  My Events
    📦  Packages
🎫  Sales               ▾
    🎫  Inventory
    📣  Promotions
📈  Insights         ✓  ▾
    👥  Clients
    📊  Performance
    💵  Earnings
    📈  Growth           ✓
```

