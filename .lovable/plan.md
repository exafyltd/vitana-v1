

# Integrate Filter Chip into Search Button

## Goal
Merge the standalone `MobileFilterChip` into the `ExpandableSearchButton` so the active filter label (e.g., "🔥 Hot") appears as a compact chip attached to the right side of the Search pill — matching the uploaded reference screenshot. This removes one separate item from the utility rail while keeping the filter always visible.

## Changes

### 1. `src/components/ui/expandable-search-button.tsx` — Add filter chip prop

Add optional props for an inline filter chip:
- `filterLabel?: string` — e.g., "🔥 Hot"
- `onFilterClick?: () => void` — opens the bottom sheet

**Collapsed state**: Render the button as `[🔍 Search | 🔥 Hot ▾]` — a single pill with a subtle divider between Search and the filter chip. The filter side is tappable independently (calls `onFilterClick`), while the search side expands the input as before.

**Expanded state**: The filter chip disappears (search input takes full width), same as current behavior.

### 2. `src/pages/community/EventsAndMeetups.tsx` — Restructure mobile filter integration

**a) Extract the Sheet from `MobileFilterChip`**: Keep the `Sheet` (bottom sheet with filter options) but manage its `open` state in the parent, so the `ExpandableSearchButton` can trigger it via `onFilterClick`.

**b) Pass filter props to `ExpandableSearchButton`**: On mobile, pass `filterLabel={active.icon + ' ' + active.label}` and `onFilterClick={() => setFilterSheetOpen(true)}` to the search button.

**c) Remove the standalone `MobileFilterChip` button** from `afterGiftVoucherChildren` — it's now part of the search pill.

### Files changed
1. `src/components/ui/expandable-search-button.tsx` — add `filterLabel` + `onFilterClick` props, render combined pill
2. `src/pages/community/EventsAndMeetups.tsx` — wire filter sheet to search button, remove standalone chip

### Visual result (collapsed)
```text
[ 🔍 Search │ 🔥 Hot ▾ ]  [ 📅 ]  [ + Create ]  [ 🎁 ]  [ 🧬 ]  [ ✈ ]
```

