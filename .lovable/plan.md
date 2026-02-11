
# Full-Screen Hero Event Cards on Mobile

## What changes

Make the mobile event carousel on `/comm/events-meetups` feel like immersive, full-screen hero cards by (a) compressing the top section (header, action bar, tabs) and (b) making cards edge-to-edge with stronger visual treatment.

## Technical details

### 1. `src/pages/community/EventsAndMeetups.tsx`

**Compress page padding on mobile (line 649-652)**
- Change the outer container: on mobile, reduce `p-6` to `px-2 pt-2 pb-0`
- Keep desktop unchanged

**Reduce SplitBarContent top margin (lines 733, 807)**
- Change `className="mt-6"` to `className={isMobile ? "mt-1" : "mt-6"}` on both Today and Upcoming SplitBarContent elements (and Following/Recommended for consistency)

**Reduce SplitBarList bottom margin**
- Pass a tighter className to SplitBarList on mobile: override `mb-6` to `mb-2`

### 2. `src/components/StandardHeader.tsx`

**Tighter mobile header (lines 33-40)**
- Reduce top/bottom padding: `pt-4 pb-2` to `pt-2 pb-1`
- Title stays `text-xl` (already compact)
- Reduce subtitle margin: `mt-1` to `mt-0.5`

### 3. `src/components/community/MobileEventCarousel.tsx`

**Increase card viewport height (lines 232-235, 246)**
- Change the shared height offset from `calc(100dvh - 296px)` to `calc(100dvh - 220px)` to reclaim the space freed by the compressed header area

**Edge-to-edge card styling (lines 248, 257)**
- Change card wrapper padding from `padding: '8px 12px'` to `padding: '6px 8px'`
- Update NewsCard className: add `rounded-[26px]` (up from `rounded-2xl`), add `ring-1 ring-black/5`, add `shadow-[0_18px_45px_rgba(0,0,0,0.18)]`

**Keep bottom safe area**
- The snap container height already accounts for the bottom nav/orb via the offset calculation; no additional bottom padding changes needed since we're only changing the top offset

### Summary of spacing gains

```text
Before (296px reserved):
  StandardHeader:  ~56px (pt-4 + title + subtitle + pb-2)
  UtilityActionBar: ~52px
  SplitBarList:     ~56px (tabs + mb-6)
  SplitBarContent:  ~24px (mt-6)
  Page padding:     ~48px (p-6 top + bottom)
  Subtotal:        ~236px header + 60px nav/orb = 296px

After (~220px reserved):
  StandardHeader:  ~40px (pt-2 + title + subtitle + pb-1)
  UtilityActionBar: ~48px (slightly tighter)
  SplitBarList:     ~40px (tabs + mb-2)
  SplitBarContent:  ~4px (mt-1)
  Page padding:     ~16px (px-2 pt-2)
  Subtotal:        ~148px header + ~72px nav/orb = 220px
```

Cards gain ~76px of additional height, filling more of the viewport for that hero feel.

### Files to modify

| File | Changes |
|------|---------|
| `src/pages/community/EventsAndMeetups.tsx` | Mobile padding `p-6` to `px-2 pt-2 pb-0`; SplitBarContent `mt-6` to `mt-1` on mobile; pass tighter className to SplitBarList |
| `src/components/StandardHeader.tsx` | Mobile: `pt-4 pb-2` to `pt-2 pb-1`, `mt-1` to `mt-0.5` |
| `src/components/community/MobileEventCarousel.tsx` | Height offset `296px` to `220px`; card padding tighter; stronger shadow + ring + larger border radius |
