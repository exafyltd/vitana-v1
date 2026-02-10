

# Fix: Snap Carousel Clipped by Layout Chain

## Problem Confirmed

The screenshot shows 65 events loaded and the debug fallback list renders, proving data flow is fine. The snap carousel container exists but has **zero visible height** because:

1. The debug fallback list consumes vertical space, pushing the snap container down
2. Radix `TabsPrimitive.Content` does not inherently participate in flex layout -- it renders as a block-level `div`. Even though we pass `flex-1 min-h-0 flex flex-col overflow-hidden` as className, the parent flex chain breaks at the `SplitBar` (Radix Tabs root) which is also not a flex container

## Changes

### 1. `MobileEventCarousel.tsx` -- Remove fallback list, reposition debug banner

- Delete the entire "DEBUG FALLBACK LIST" block (lines 258-265)
- Move the debug banner to a `fixed` position so it does not consume any layout height:
  - `className="fixed left-1/2 -translate-x-1/2 bottom-[84px] z-[9999]"`
- Add `border border-red-500` temporarily to the snap container for visibility debugging (remove after confirmed working)
- Add safe bottom padding to the snap container: `pb-[120px]` with `paddingBottom: calc(120px + env(safe-area-inset-bottom))`

### 2. `MobileEventCarousel.tsx` -- Use explicit viewport height instead of flex-1

Since the flex chain from page root to carousel is broken by Radix Tabs intermediaries, **stop relying on flex-1** for the snap container. Instead, give it an explicit height:

- Root wrapper: `className="relative w-full"` with `style={{ height: 'calc(100dvh - ${CHROME_HEIGHT_PX}px)' }}`
- Snap container: `className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"` (no flex-1)
- This makes the carousel self-sizing regardless of what ancestors do

### 3. `EventsAndMeetups.tsx` -- Keep mobile overflow suppression

- The existing `h-[100dvh] overflow-hidden flex flex-col` on the page wrapper (line 649) stays -- it prevents background scrolling
- The existing `flex-1 min-h-0 flex flex-col overflow-hidden` on the content div (lines 650, 713) stays
- No other changes needed here since the carousel will now self-size with an explicit height

### 4. `split-bar.tsx` -- Add flex support to SplitBarContent

- Update the `SplitBarContent` base className to include `data-[state=active]:flex` so when a tab is active, it becomes a flex container if the consumer passes flex classes
- This is a minor enhancement but not strictly required since we're using explicit height

## Summary

The core fix is switching from `flex-1` (which requires an unbroken flex chain) to an **explicit `calc(100dvh - 216px)` height** on the carousel root. This makes it immune to Radix Tabs breaking the flex chain. The debug fallback list is removed from flow, and the banner becomes a fixed overlay.

| File | Change |
|------|--------|
| `MobileEventCarousel.tsx` | Remove fallback list. Fix banner to `fixed` position. Use explicit height instead of flex-1. Add bottom padding for nav/orb. |
| `EventsAndMeetups.tsx` | No changes needed (existing mobile overflow suppression is correct). |
| `split-bar.tsx` | Optional: no changes strictly required. |

