

# Unified Mobile Top Section + Premium Recommendation Cards for Discover

## Summary

Apply the same mobile hub pattern (compact header, utility rail with `MobileModePill`, tighter spacing) to the Discover screen. Redesign the mobile Discover cards as a premium recommendation-card system — same visual family as Events/Live Rooms but optimized for browsing rather than immersive hero cards.

## Changes

### 1. `src/pages/Discover.tsx` — Unified mobile top section

**Header & spacing:**
- Add `compact` prop to `UtilityActionButton` on mobile
- Reduce outer padding: `px-3 pb-32` on mobile (matches other hubs)
- Reduce `space-y-6` → `space-y-3` on mobile for tighter content start

**MobileModePill integration:**
- Add `MobileModePill` after `ExpandableSearchButton` with modes:
  - `{ value: "suggested", label: "AI Picks", icon: "💡" }`
  - `{ value: "categories", label: "Categories", icon: "📂" }`
  - `{ value: "share", label: "Share & Earn", icon: "💰" }`
- Wire to `activeTab` / `setActiveTab` state (already exists)
- Instead of rendering `MobileDiscoverView` unconditionally on mobile, render the appropriate content section based on `activeTab` — reusing the same `SplitBarContent` logic but without the `SplitBarList` row

**Content rendering on mobile:**
- When `activeTab === "suggested"`: show redesigned AI recommendation cards (see below)
- When `activeTab === "categories"`: show category grid
- When `activeTab === "share"`: show Share & Earn content
- Remove the separate `MobileDiscoverView` rendering; integrate its content into the tab-driven sections

### 2. `src/components/discover/MobileDiscoverView.tsx` — Redesign as premium recommendation cards

Redesign the component to be a **premium recommendation-card system** rather than a basic carousel:

**Card design (same visual family, not hero clones):**
- `rounded-[20px]` corners (matching hub card family)
- Stronger image presence: `h-48` images with gradient overlay from bottom
- Title, provider, and match badge overlaid on the gradient
- AI reason chip with frosted glass treatment (`bg-white/10 backdrop-blur`)
- Price and CTA buttons below the image area
- Premium shadow treatment: `shadow-lg` with subtle purple tint

**Featured card variant:**
- First card in the list rendered at larger size (`w-full` instead of carousel item)
- Taller image (`h-56`), larger text, more prominent badge
- Acts as a "hero recommendation" while remaining a card (not full-viewport)

**Layout:**
- Remove Embla carousel — use vertical scroll with gap-3
- Featured (first) card full-width at top
- Remaining cards in a 2-column grid below
- Keep the category grid section and quick actions section below

**Typography quality:**
- Card titles: `text-base font-semibold` with `line-clamp-2`
- Provider name: `text-xs text-muted-foreground`
- Match percentage: solid badge with gradient background
- Price: `text-lg font-bold`

### 3. Visual consistency with hub family

- Same `rounded-[20px]` border radius as Events/Live Rooms cards
- Same shadow depth and border treatment
- Same gradient overlay technique (bottom-up, darker)
- Same badge positioning (top-left for type, top-right for match %)
- Same spacing discipline (`gap-3` between cards)
- But NOT snap-scroll or full-viewport height — these are browsable recommendation cards

## Files Changed

1. **`src/pages/Discover.tsx`** — Add `MobileModePill` to utility rail, use `compact` on `UtilityActionButton`, switch mobile rendering to tab-driven content
2. **`src/components/discover/MobileDiscoverView.tsx`** — Redesign cards as premium recommendation system with featured card variant, vertical scroll layout, stronger image presence

## What stays the same

- Desktop layout unchanged (SplitBar tabs, 3-card header)
- SubNavigation hidden on mobile (already done)
- Autopilot and Vitana Index pills in utility rail (already there)
- All data sources unchanged

