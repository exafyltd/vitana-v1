

# Unified Mobile Top-Section System

## Summary

Compress and unify the mobile top chrome across Business Hub, Media Hub, and Live Rooms to match the content-first pattern established on Events. All four screens will share the same hierarchy: compact title, compact utility rail, tightened mode/filter chips, then immediate content.

## Changes

### 1. `src/pages/BusinessHub.tsx` — Compress mobile container

**Line 120**: Change `p-4 pb-32 space-y-4` to `px-4 pt-1 pb-32 space-y-1` (tighter vertical gaps, keep horizontal padding breathable)

**Line 128**: Add `compact` prop to `UtilityActionButton`

**Line 185**: On the `SplitBar`, remove any extra top margin — change `className="w-full"` stays, but add `className="w-full mt-1"` (minimal gap)

**Line 186**: On `SplitBarList`, add `className="mb-2"` to tighten below chips

**Lines 194, 219, 224, 229**: Change `SplitBarContent` from `className="space-y-4 pt-2"` / `className="pt-2"` to `className="space-y-3 pt-1"` / `className="pt-1"` for tighter content start

### 2. `src/pages/community/MediaHub.tsx` — Compress mobile layout + reduce content dead space

**Line 557**: For mobile, change the wrapping `div` from `p-6` to conditional: `isMobile ? "px-4 pt-1 pb-0" : "p-6"` (keep desktop untouched)

**Line 569**: Add `compact` prop to mobile `UtilityActionButton`

**Line 727**: On the `SplitBar`, reduce mobile top margin: add `className={cn("w-full", isMobile && "mt-1")}`

**Line 728**: On `SplitBarList`, add `className={isMobile ? "mb-2" : undefined}` to tighten below chips

**Lines 743-756** (mobile shorts content area): Reduce the spacing inside the mobile shorts section:
- Change `space-y-4` to `space-y-2`
- Change `py-4` on the text-center div to `py-2`
- Change `mb-3` on the paragraph to `mb-2`
- This pulls the "34 shorts available" label, CTA button, and preview grid closer together and closer to the tabs

### 3. `src/pages/community/LiveRooms.tsx` — Compress mobile + card parity with Events

**Line 559**: Keep `px-2 pt-2 pb-0` (already tight, consistent with Events)

**Line 566**: Add `compact` prop to `UtilityActionButton`

**Line 623**: Change `mt-2` to `mt-1` on SplitBar for mobile

**Line 624**: Change `mb-2` to `mb-1` on SplitBarList for mobile

**Line 652**: Change `mt-1` to `mt-0` on SplitBarContent for mobile

**Lines 688-700** (empty state): Change `py-12` to `py-6` so empty state sits higher, closer to tabs

Similarly for scheduled empty state (~line 740) and past empty state

### 4. `src/components/community/MobileLiveRoomCarousel.tsx` — Match Events hero-card height

**Lines 230, 242**: Change `calc(100dvh - 282px)` to `calc(100dvh - 190px)` — matching exact Events carousel height for full card parity

### Files changed
1. `src/pages/BusinessHub.tsx` — tighten mobile vertical spacing, add `compact` to utility rail
2. `src/pages/community/MediaHub.tsx` — tighten mobile container + reduce content dead space below tabs
3. `src/pages/community/LiveRooms.tsx` — tighten spacing, add `compact`, compress empty states
4. `src/components/community/MobileLiveRoomCarousel.tsx` — height `282px` to `190px` for Events card parity

### What stays the same
- Desktop layouts completely untouched on all screens
- Horizontal padding kept balanced (`px-4` on Business/Media, `px-2` on Live Rooms/Events to match existing patterns)
- All SplitBarList mode tabs remain visible
- All utility rail items preserved (Search, Calendar, CTA, Gift Voucher, Vitana Index, Autopilot)
- Screen-specific CTA labels preserved (Create / Upload / Go Live)
- `StandardHeader` already renders compact on mobile from previous Events redesign

