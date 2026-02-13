

# Convert Live Rooms Mobile to Vertical Snap-Scroll (Match Events Pattern)

## Problem
The mobile Live Rooms currently use a horizontal Embla carousel (left-right swipe with dot indicators). The user wants them to match the Events screen: vertical snap-scrolling, full-width cards filling the viewport, one card per screen.

## Solution
Replace the `MobileLiveRoomCarousel` component's horizontal Embla carousel with the same vertical CSS snap-scroll pattern used in `MobileEventCarousel`.

## Changes

### File: `src/components/community/MobileLiveRoomCarousel.tsx`

**Remove:**
- Embla carousel import and setup (`useEmblaCarousel`)
- Horizontal `flex` layout with `w-screen` slides
- Dot indicators and counter at the bottom
- Keyboard ArrowLeft/ArrowRight navigation

**Add (matching MobileEventCarousel exactly):**
- A `containerRef` div with `overflow-y-auto snap-y snap-mandatory scrollbar-hide`
- Container height set to `calc(100dvh - 220px)` (same as Events)
- Each card wrapped in a `snap-start` div with the same height, `scrollSnapStop: 'always'`
- Scale/opacity transitions for active vs inactive cards (scale 1 vs 0.97, opacity 1 vs 0.7)
- `IntersectionObserver` (threshold 0.6) to detect current card index
- Keyboard ArrowUp/ArrowDown navigation instead of Left/Right
- Pull-to-refresh support (touch handlers with `passive: false`, indicator pill)
- Hidden scrollbar CSS
- `LiveRoomCard` fills the full card height with `h-full rounded-[26px] ring-1 ring-black/5 shadow-[0_18px_45px_rgba(0,0,0,0.18)]`

### File: `src/pages/community/LiveRooms.tsx`

- No structural changes needed -- it already renders `MobileLiveRoomCarousel` for mobile. The component's props interface stays the same.

## Technical Details

| Aspect | Current (Horizontal) | New (Vertical Snap) |
|--------|---------------------|---------------------|
| Scroll direction | Horizontal (Embla) | Vertical (CSS snap) |
| Card sizing | `h-[calc(100vh-280px)]` | `h-[calc(100dvh-220px)]` (full section) |
| Active detection | Embla `onSelect` | IntersectionObserver (0.6 threshold) |
| Navigation | ArrowLeft/Right | ArrowUp/Down |
| Indicators | Dot pills + counter | None (matches Events) |
| Card styling | Basic height constraint | `rounded-[26px] ring-1 shadow-[0_18px_45px]` |
| Pull-to-refresh | Not supported | Supported via touch handlers |

