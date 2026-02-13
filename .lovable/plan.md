

# Pull CTA Buttons Above Bottom Navigation

## Problem
The Live Room cards (and Event cards) use `calc(100dvh - 220px)` for their height, but this doesn't leave enough room for the bottom navigation bar and the Orb. The CTA buttons (Share, Join) at the bottom of each card slip behind these elements.

## Solution
Increase the height offset from `220px` to `280px` in the `MobileLiveRoomCarousel` so the cards end well above the bottom nav bar and Orb. This gives roughly 60px more clearance at the bottom.

## Changes

### File: `src/components/community/MobileLiveRoomCarousel.tsx`
- Change both instances of `calc(100dvh - 220px)` to `calc(100dvh - 280px)` -- one on the scroll container (line 220) and one on each card wrapper (line 234)

This is a two-line change that ensures the card's bottom content (avatars, location chip, Share/Join buttons) stays fully visible above the bottom navigation and the Orb.

