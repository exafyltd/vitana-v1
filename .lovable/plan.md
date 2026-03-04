

## Problem

The default tab in `EventsAndMeetups.tsx` was changed to "hot", but **four redirect locations** still hardcode `?tab=upcoming` as the mobile landing destination:

1. **`src/hooks/useSmartRouting.tsx`** — lines 65, 108, 152: three occurrences of `"/comm/events-meetups?tab=upcoming"`
2. **`src/pages/portals/MaxinaPortal.tsx`** — lines 87, 103, 139, 381: four occurrences of `"/comm/events-meetups?tab=upcoming"`
3. **`src/pages/Community.tsx`** — line 1015: one occurrence

## Fix

Replace all `?tab=upcoming` with `?tab=hot` across these three files (8 total occurrences). No other logic changes needed — the `EventsAndMeetups` page already handles `tab=hot` correctly as the default.

### Files to edit
- `src/hooks/useSmartRouting.tsx` — 3 replacements
- `src/pages/portals/MaxinaPortal.tsx` — 4 replacements
- `src/pages/Community.tsx` — 1 replacement

