
# Match Live Rooms to Events Layout + Shift CTAs Right

## Problem
1. Live Rooms cards are full-bleed (`px-0`, `rounded-none`) while Events cards have a "framed" look (`px-2`, `rounded-[26px]`, ring, shadow, padding between cards).
2. On both screens, the CTA buttons (Share/Join on Live Rooms, Share/Reserve Spot on Events) can overlap with the centered Orb.

## Changes

### 1. `src/pages/community/LiveRooms.tsx`
- Change mobile container from `px-0` back to `px-2` to match Events' framed alignment.

### 2. `src/components/community/MobileLiveRoomCarousel.tsx`
- Restore card wrapper styling to match `MobileEventCarousel` exactly:
  - Add back `padding: '4px 0px'` on each card wrapper
  - Add back `border-b border-border/30` between cards
  - Change `LiveRoomCard` className from `rounded-none` back to `rounded-[26px] ring-1 ring-black/5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]`
- Match container height to Events: change `calc(100dvh - 280px)` to `calc(100dvh - 220px)` (same value Events uses)

### 3. `src/components/liverooms/LiveRoomCard.tsx` (CTA row)
- Increase right padding from `pr-2` to `pr-4` to shift Share + Join buttons further right, clearing the Orb.

### 4. `src/components/crossover/NewsCard.tsx` (Events CTA zone)
- Change the action button zone from `right-6` to `right-4` (or add extra right offset) to shift the Reserve Spot / Share buttons further right, matching the same Orb-clearing adjustment.
- Current: `absolute bottom-6 right-6`
- New: `absolute bottom-6 right-4` -- this keeps them snug to the right edge, away from the center Orb.

Wait -- looking at the screenshot again, the Events CTA ("Reserve Spot") is already quite far right. The issue is it's still close to the Orb. Let me reconsider: increasing `right` value pushes buttons further FROM the right edge (toward center/Orb). So to move buttons MORE to the right (away from Orb), we should DECREASE the right value or keep it and the current position may already be fine on Events.

Looking at the Events screenshot, "Reserve Spot" button is on the right side and the Orb partially covers it. To fix this on BOTH screens, the buttons need to stay right-aligned but the card content should end above the Orb zone. Since the Orb is center-bottom, the real fix is ensuring the CTA row is high enough above the bottom of the card.

Actually, re-examining: the CTA buttons ARE at the bottom-right of the card. The Orb sits center-bottom of the SCREEN, overlapping the bottom of the card. The buttons just need a bit more rightward push so they don't fall in the Orb's center zone.

### Revised approach for CTAs:

**LiveRoomCard.tsx**: Change CTA row to `pr-4` (from `pr-2`) -- pushes buttons further right.

**NewsCard.tsx**: The action zone is at `absolute bottom-6 right-6`. To push slightly more right, change to `right-4` (closer to edge = more rightward, further from center Orb). This is a subtle 8px shift.

## Summary of all changes

| File | Change |
|------|--------|
| `LiveRooms.tsx` | Mobile container: `px-0` to `px-2` |
| `MobileLiveRoomCarousel.tsx` | Restore framed card style matching Events (rounded, ring, shadow, padding, borders, height `220px`) |
| `LiveRoomCard.tsx` | CTA row: `pr-2` to `pr-4` |
| `NewsCard.tsx` | Action button zone: `right-6` to `right-4` |

These four small changes make the two screens visually identical in layout while keeping CTAs clear of the Orb.
