

## Fix Event Card CTA Visibility Above Bottom Nav

### Problem
The event card currently uses `calc(100dvh - 252px)` for height, which accounts for the top elements (app bar, header, tabs) but does not leave enough room at the bottom for the bottom navigation bar (~56px + safe area). The "Buy Tickets" CTA button gets hidden behind the bottom nav and orb.

### Solution
Increase the subtracted value by 20px -- from `252px` to `272px` -- so the card ends just above the bottom nav bar. The app bar height stays untouched.

### Changes

**1. `src/components/community/MobileEventCarousel.tsx`** (2 occurrences)
- Change `calc(100dvh - 252px)` to `calc(100dvh - 272px)` for both the scroll container and each card wrapper

**2. `src/components/community/MobileLiveRoomCarousel.tsx`** (2 occurrences)
- Same change: `calc(100dvh - 252px)` to `calc(100dvh - 272px)`

### What stays unchanged
- Top App Bar height (32px / `h-8`) -- no changes
- MobileAppShell padding -- no changes
- MobileMuteButton offset -- no changes
- Bottom nav bar -- no changes

