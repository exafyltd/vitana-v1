

# Redesign Mobile Events Screen — Content-First Compression

## Summary

Remove the feed filter tab row (Hot/Upcoming/Today/Following) on mobile, compress the header, and integrate feed filters into the search experience. This frees ~80px of vertical space so the first event card starts much higher and dominates the viewport.

## Current mobile layout (top to bottom)

```text
┌──────────────────────────┐
│ MAXINA app bar           │  ~44px
├──────────────────────────┤
│ "Events & Meet-Ups"     │  ~52px  (StandardHeader)
│ "Discover formal..."     │
├──────────────────────────┤
│ Search | Calendar | +    │  ~56px  (UtilityActionButton)
│ Gift | 🧬 | Autopilot   │
├──────────────────────────┤
│ 🔥Hot | 📅Upcoming |... │  ~40px  (SplitBarList)
├──────────────────────────┤
│                          │
│   Event Card (snap)      │  remaining
│                          │
└──────────────────────────┘
```

## New mobile layout

```text
┌──────────────────────────┐
│ MAXINA app bar           │  ~44px
├──────────────────────────┤
│ Events                   │  ~28px  (compact label)
├──────────────────────────┤
│ 🔍 | 📅 | + | 🎁 |🧬|✈│  ~44px  (tighter utility rail)
│  [Showing: Hot ▾]        │         (active filter chip)
├──────────────────────────┤
│                          │
│   Event Card (snap)      │  remaining (~120px taller)
│                          │
└──────────────────────────┘
```

## Changes

### 1. `src/components/StandardHeader.tsx` — Compress mobile header

In the mobile branch (line 32-41):
- Reduce padding from `pt-2 pb-1` to `pt-1 pb-0`
- Reduce title from `text-xl` to `text-lg`
- Remove the subtitle `<p>` on mobile (or make it hidden)
- This saves ~24px vertical space

### 2. `src/components/ui/utility-action-button.tsx` — Tighten mobile spacing

- Reduce padding from `pt-4 pb-5` to `pt-2 pb-2` on mobile (accept an `isMobile` prop or use a tighter className)
- The component is used across pages, so we'll pass a `compact` prop or apply tighter spacing via the existing `className` prop from the parent

### 3. `src/pages/community/EventsAndMeetups.tsx` — Main restructuring (mobile only)

**a) Hide SplitBarList on mobile** (line 777-790)
- Wrap `<SplitBarList>` with `{!isMobile && ...}` so the tab row is completely removed on mobile
- The `SplitBar` component and `SplitBarContent` wrappers remain — the `activeTab` state still controls which content is shown, just no visible tab bar

**b) Add a filter chip to the utility rail on mobile**
- Inside the `UtilityActionButton` children (around line 754), add a compact filter chip button visible only on mobile
- The chip shows the active filter label (e.g., "Hot", "Upcoming", "Today")
- Tapping it opens a bottom sheet / dropdown with the filter options
- Selecting a filter calls `setActiveTab(value)` and closes the sheet

**c) Adjust MobileEventCarousel height**
- Current height: `calc(100dvh - 282px)` in `MobileEventCarousel.tsx` (line 217, 229)
- New height: `calc(100dvh - 190px)` — accounts for the ~92px saved from compressed header + removed tab row
- This makes the first card ~92px taller

**d) Tighten the sticky header block spacing** (line 710-791)
- Reduce `pb-1` to `pb-0` on the sticky header wrapper
- Pass `compact` className to `UtilityActionButton`

### 4. `src/components/community/MobileEventCarousel.tsx` — Update card height

- Change both height values from `282px` to `190px` in the subtraction
- The card will fill more of the viewport

### 5. New: Filter chip + bottom sheet component (inline in EventsAndMeetups.tsx)

Create a small inline component `MobileFilterChip` that:
- Renders a pill button showing the current filter with a chevron
- On tap, opens a `Sheet` (already available via shadcn) from the bottom
- Sheet contains the filter options: Hot, Upcoming, Today, Following
- Each option is a button that sets `activeTab` and closes the sheet
- The active filter is highlighted

This keeps all filter functionality accessible while removing the dedicated row.

### Files changed
1. `src/components/StandardHeader.tsx` — compress mobile header
2. `src/components/ui/utility-action-button.tsx` — add `compact` prop for tighter spacing
3. `src/pages/community/EventsAndMeetups.tsx` — hide tab row on mobile, add filter chip, adjust spacing
4. `src/components/community/MobileEventCarousel.tsx` — increase card height

### What stays the same
- Desktop layout is completely untouched
- All filter functionality remains available (via the chip + sheet)
- Utility rail keeps all 6 items: Search, Calendar, Create, Gift Voucher, Vitana Index, Autopilot
- Event card rendering, snap scroll, and interaction behavior unchanged
- SplitBar state management unchanged (just the visible tab bar is hidden on mobile)

