

# Improve bottom nav spacing around the central Orb

## Problem
The 4 nav items use `justify-around` with `px-1` container padding and `px-3 min-w-[60px]` per item. The two inner items (Inbox, Live) cluster toward the center where the Orb FAB floats, leaving uneven visual distribution.

## Fix
Two changes in `MobileBottomNav.tsx`:

1. **Container**: Change `px-1` to `px-4` and switch from `justify-around` to `justify-between` — this pushes the outer items (Events, Profile) toward the edges and spaces the inner items more evenly.

2. **Nav items**: Replace `px-3 min-w-[60px]` with `flex-1 px-1` so each item takes equal width across the bar, naturally creating even gaps and leaving consistent space around where the Orb sits.

### Single file change
**`src/components/mobile/MobileBottomNav.tsx`**
- Line 72: `px-1` → `px-4`, `justify-around` → `justify-between`
- Line 103: `px-3 min-w-[60px]` → `flex-1 px-1`

