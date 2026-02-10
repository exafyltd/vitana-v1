

# Fix: CTA Buttons Hidden Behind Bottom Navigation

## Problem

The event card height is set to `calc(100dvh - 216px)`, which accounts for the header chrome above but does NOT account for the bottom navigation bar (~80px). The cards extend behind the nav, making "Buy Ticket" and other CTA buttons untappable.

## Solution

Increase the height offset to include the bottom nav bar. Change from `216px` to `296px` (216 + 80 for the nav). This applies to both the scroll container height and each card wrapper height so they stay synchronized.

## Technical Changes

### File: `src/components/community/MobileEventCarousel.tsx`

- **Line 233**: Change container height from `calc(100dvh - 216px)` to `calc(100dvh - 296px)`
- **Line 246**: Change card wrapper height from `calc(100dvh - 216px)` to `calc(100dvh - 296px)`

This keeps the "one card = one screen" behavior intact while ensuring the bottom of each card (where CTAs live) sits above the bottom navigation bar and orb.

