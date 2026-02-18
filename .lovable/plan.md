

## Reduce App Bar Height by ~0.5cm

### Problem
The CTA button ("Buy Tickets") on event cards still falls behind the bottom nav bar. Reducing the app bar by approximately 0.5cm (~12px) will push cards up enough to make the CTA fully visible.

### Approach
Reduce the inner toolbar from 44px (`h-11`) to 32px (`h-8`), reclaiming 12px of vertical space. Update all dependent offsets.

### Changes

**1. `src/components/mobile/TopAppBar.tsx`**
- Inner row: `h-11` (44px) to `h-8` (32px)
- Menu button: `w-9 h-9` to `w-8 h-8`
- Title font: `text-[22px]` to `text-[20px]` (proportional)
- Right spacer: `w-9` to `w-8`

**2. `src/components/mobile/MobileAppShell.tsx`**
- Padding: `44px` to `32px`

**3. `src/components/audio/MobileMuteButton.tsx`**
- Offset: `48px` to `36px`

**4. `src/components/community/MobileEventCarousel.tsx`**
- Height: `264px` to `252px` (2 occurrences)

**5. `src/components/community/MobileLiveRoomCarousel.tsx`**
- Same: `264px` to `252px` (2 occurrences)

### Math
- Old: safe-area + 44px = 264px offset
- New: safe-area + 32px = 252px offset (12px reclaimed)
- Cards gain 12px, pushing CTA above the bottom nav
