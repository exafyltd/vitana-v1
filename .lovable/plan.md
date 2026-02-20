
## Fix: Inbox Search Utility Bar — Input Gets Clipped by Scroll Container

### Root Cause

The `ExpandableSearchButton` lives inside `UtilityActionButton`, which wraps its children in a **horizontally scrollable row** (`overflow-x-auto`). When the search expands to `w-64`, the input form is clipped by the scroll container — on mobile this means the input is either not visible, not focusable properly, or appears to do nothing visually. The logic works (state updates, filter runs) but the user never sees filtered results because the expanded input is hidden inside the scroll overflow.

The relevant container in `utility-action-button.tsx`:
```typescript
<div className="flex gap-2.5 items-center overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2 -my-2">
  {children}   {/* ← ExpandableSearchButton is here, clipped when expanded */}
```

### The Fix

**Move the `ExpandableSearchButton` out of the `UtilityActionButton` children** and place it as a separate full-width search row below the utility bar, only when expanded. The simplest approach: keep the Search pill button inside the utility bar (collapsed state), but when expanded, render a **full-width search input** as a separate `<div>` below the utility rail, outside the scroll container.

The cleanest implementation is to **lift the expanded state up** into `Messages.tsx` and render the expanded search input as its own row:

**Pattern (conceptual):**
```
[Utility Bar: Search pill | Gift Voucher | Autopilot | Calendar | + New]
[Full-width search input row — only shown when search is active]
```

This matches the pattern used by apps like iOS Mail and WhatsApp where the search bar drops down as its own full-width row separate from the action toolbar.

### Files to Edit

**1. `src/components/ui/expandable-search-button.tsx`**
Add an `isExpanded` / `onExpandedChange` prop pair so the parent can know when search is active, OR split into two exports: a collapsed trigger button and a separate expanded input. The simplest change: add an `onExpandChange` callback prop.

**2. `src/pages/Messages.tsx`**
- Add `isSearchExpanded` state (boolean)
- Keep the `ExpandableSearchButton` in the utility bar but pass `onExpandChange` to track its state
- Render a separate full-width search input row below the `UtilityActionButton` when `isSearchExpanded` is true
- OR: replace `ExpandableSearchButton` in the utility bar with a simple icon-only `Search` button, and manage the full expanded state entirely in `Messages.tsx` as a separate row

The most self-contained fix (least risk of regressions to other pages using `ExpandableSearchButton`):

**In `Messages.tsx` mobile layout**, replace the current `ExpandableSearchButton` with:
1. A plain Search icon button inside the utility rail (collapsed state only)
2. A full-width animated search input row below the utility bar (expanded state)

This avoids touching `ExpandableSearchButton` at all and keeps the fix local to the Inbox screen.

### Detailed Changes

**`src/pages/Messages.tsx`** — mobile inbox section (lines 893–950):

Replace:
```tsx
<UtilityActionButton className="min-w-0" afterGiftVoucherChildren={...}>
  <div className="flex items-center gap-2 min-w-max">
    <ExpandableSearchButton 
      onSearch={(query) => setInboxSearchQuery(query)}
      onClear={() => setInboxSearchQuery("")}
    />
    <UniversalCalendarButton />
    <Button ...>+ New</Button>
  </div>
</UtilityActionButton>
```

With:
```tsx
<UtilityActionButton className="min-w-0" afterGiftVoucherChildren={...}>
  <div className="flex items-center gap-2 min-w-max">
    {/* Search icon pill — tapping expands a separate full-width row below */}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setIsSearchExpanded(true)}
      className="h-9 px-3 rounded-full bg-muted/60 hover:bg-muted gap-1.5 shrink-0"
    >
      <Search className="w-4 h-4" />
      <span className="text-sm">Search</span>
    </Button>
    <UniversalCalendarButton />
    <Button ...>+ New</Button>
  </div>
</UtilityActionButton>

{/* Full-width search row — rendered outside the scroll container */}
{isSearchExpanded && (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      autoFocus
      value={inboxSearchQuery}
      onChange={(e) => setInboxSearchQuery(e.target.value)}
      onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
      placeholder="Search conversations..."
      className="pl-10 pr-10 h-10 w-full rounded-xl"
    />
    <Button ... onClick={closeSearch}><X /></Button>
  </div>
)}
```

Where `closeSearch` sets `isSearchExpanded = false` and `inboxSearchQuery = ""`.

### New State to Add
```typescript
const [isSearchExpanded, setIsSearchExpanded] = useState(false);
```

### Summary of Changes
- `src/pages/Messages.tsx`: Add `isSearchExpanded` state; replace `ExpandableSearchButton` in mobile inbox with a simple Search pill button + a separate full-width input row below the utility bar; add `closeSearch` helper
- No changes to `expandable-search-button.tsx` (this fix is self-contained to Inbox)
