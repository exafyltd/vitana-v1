

# Unified Mobile Mode Pill in Utility Rail

## Summary

Create a reusable `MobileModePill` component and integrate it into the utility rail of **Media Hub**, **Live Rooms**, and **Business Hub** on mobile. This replaces the separate `SplitBarList` tab row with a compact dropdown pill placed immediately after Search, matching the Events pattern.

## New Component

### `src/components/ui/MobileModePill.tsx`

A reusable pill button that:
- Displays current mode label with emoji prefix and chevron-down affordance
- Opens a bottom `Sheet` with mode options on tap
- Styled as `h-9 px-3 rounded-full bg-muted/60 hover:bg-muted shrink-0` (matches existing utility rail pills)
- Props: `modes: { value: string; label: string; icon?: string; badge?: number }[]`, `activeMode: string`, `onModeChange: (value: string) => void`
- The Sheet lists modes as tappable rows with active state highlighting

## File Changes

### 1. `src/pages/community/MediaHub.tsx` — Mobile only

**In the mobile utility rail** (inside `UtilityActionButton children`, lines ~607-626):
- After `ExpandableSearchButton`, insert `<MobileModePill>` with modes: Shorts, Music, Podcasts
- Wire `activeMediaTab` / `setActiveMediaTab`

**Remove mobile SplitBarList** (lines ~729-740):
- Wrap `SplitBarList` in `{!isMobile && ...}` so the tab row only shows on desktop
- Keep `SplitBarContent` blocks unchanged — they still render based on `activeMediaTab`

### 2. `src/pages/community/LiveRooms.tsx` — Mobile only

**In the mobile utility rail** (inside `UtilityActionButton children`, lines ~602-619):
- After `ExpandableSearchButton`, insert `<MobileModePill>` with modes: Live Now, Scheduled, Past
- Wire `activeTab` / `setActiveTab`

**Remove mobile SplitBarList** (lines ~622-650):
- Wrap `SplitBarList` in `{!isMobile && ...}` so the tab row only shows on desktop
- Keep `SplitBarContent` blocks unchanged

### 3. `src/pages/BusinessHub.tsx` — Mobile only

**In the mobile utility rail** (inside `UtilityActionButton children`, lines ~164-181):
- After `ExpandableSearchButton`, insert `<MobileModePill>` with modes: Snapshot, Services, Sales (conditional on isReseller), Insights
- Wire to the existing `SplitBar` `defaultValue`/state (will need to lift to controlled state)

**Remove mobile SplitBarList** (lines ~185-191):
- Remove the `SplitBarList` from mobile layout
- Keep `SplitBarContent` blocks unchanged — Services/Sales tabs already render their own internal sub-tab rows (`ServicesSubTabs`, `SellAndEarnSubTabs`) which serve as the secondary submode row

### 4. Desktop unchanged

All three pages keep their existing `SplitBarList` tab rows on desktop. The `MobileModePill` only renders when `isMobile` is true.

## Utility Rail Order (all three screens)

```text
[ 🔍 Search ] [ 📹 Shorts ▾ ] [ 📅 Calendar ] [ + Create ] [ 🧬 742 ] [ ✈ Autopilot ]
```

## Visual Style

- Matches existing pills in the utility rail: `h-9 px-3 rounded-full bg-muted/60`
- Emoji prefix + label + `ChevronDown` icon
- Sheet selector uses same pattern as Events filter sheet: `SheetContent side="bottom" className="rounded-t-2xl"` with tappable rows

## Technical Notes

- Business Hub's `SplitBar` currently uses `defaultValue` — will change to controlled `value`/`onValueChange` with `useState` for the mobile mode pill to drive tab switching
- `SplitBarContent` blocks don't need wrapping in `SplitBar` when the `value` is controlled — they already respond to the parent `SplitBar` value
- Business Hub secondary submodes (ServicesSubTabs, SellAndEarnSubTabs) already render their own internal tab rows, so the "secondary submode row" requirement is already met

