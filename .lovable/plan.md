

## Reduce App Bar Height to Fit Event Cards in One Viewport

### Problem

The current app bar toolbar row is 56px (`h-14`), which pushes the event card down enough that the CTA button ("Buy Tickets") falls below the bottom nav bar. Reducing the bar height will raise the card so the CTA sits exactly above the bottom nav.

### Approach

Reduce the toolbar row from 56px (`h-14`) to 44px (`h-11`). This reclaims 12px of vertical space, pushing the card content up. All dependent offset values must be updated accordingly.

### Changes

**1. `src/components/mobile/TopAppBar.tsx`**

- Change the inner toolbar row from `h-14` (56px) to `h-11` (44px)
- Slightly reduce the kebab button tap target from `w-10 h-10` to `w-9 h-9` (still meets 44px min with padding)

**2. `src/components/mobile/MobileAppShell.tsx`**

- Update content padding from `56px` to `44px`: `calc(env(safe-area-inset-top, 0px) + 44px)`

**3. `src/components/audio/MobileMuteButton.tsx`**

- Update top offset from `60px` to `48px`: `calc(env(safe-area-inset-top, 0px) + 48px)`

**4. `src/components/community/MobileEventCarousel.tsx`**

- Update card height from `276px` to `264px` offset: `calc(100dvh - 264px)` (4 occurrences)

**5. `src/components/community/MobileLiveRoomCarousel.tsx`**

- Same height change: `calc(100dvh - 264px)` (4 occurrences)

### Math

- Old: safe-area + 56px bar = 276px total offset (with ~220px for tabs/header)
- New: safe-area + 44px bar = 264px total offset (12px reclaimed)
- Cards gain 12px, bringing the CTA above the bottom nav

