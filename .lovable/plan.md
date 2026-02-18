

## Raise Event Card CTA Above Bottom Nav

### Problem
The "Buy Ticket" CTA button is still slightly clipped by the bottom navigation bar and central orb.

### Solution
Increase the height offset by 10px -- from `272px` to `282px` -- to give more clearance at the bottom. The app bar and all other elements remain unchanged.

### Changes

**1. `src/components/community/MobileEventCarousel.tsx`** (2 occurrences)
- Change `calc(100dvh - 272px)` to `calc(100dvh - 282px)`

**2. `src/components/community/MobileLiveRoomCarousel.tsx`** (2 occurrences)
- Same change: `calc(100dvh - 272px)` to `calc(100dvh - 282px)`

### What stays unchanged
- Top App Bar height (32px / `h-8`)
- MobileAppShell padding
- MobileMuteButton offset
- Bottom nav bar

