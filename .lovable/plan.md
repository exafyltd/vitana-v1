

## Fix Mute Button and Event Card CTA Visibility

### Problem

After adding the new Top App Bar (56px / h-14), two UI elements are mispositioned on mobile:

1. **Mute button** (`MobileMuteButton.tsx`): Still at `fixed top-4 right-4` (16px from top), which is hidden behind the app bar.
2. **Event card CTA ("Buy Ticket")**: The card height is `calc(100dvh - 220px)`, calibrated before the app bar existed. Now the `MobileAppShell` adds `pt-14` (56px) of top padding, but the card height wasn't adjusted, so the bottom of each card (and its CTA at `absolute bottom-6`) overflows behind the bottom navigation.

### Changes

**1. `src/components/audio/MobileMuteButton.tsx`**

Move the mute button from `top-4 right-4` to `top-[60px] right-4` so it sits just below the 56px app bar with a small gap.

**2. `src/components/community/MobileEventCarousel.tsx`**

Increase the height offset from `220px` to `276px` (adding 56px for the new app bar). This applies to both the scroll container and each card wrapper. The new value: `calc(100dvh - 276px)`.

**3. `src/components/community/MobileLiveRoomCarousel.tsx`**

Same adjustment as above -- change `220px` to `276px` in both height declarations.

### Result

- Mute button appears just below the app bar in the top-right corner, fully visible and tappable
- Event cards fit exactly between the page header/tabs and the bottom nav bar
- The "Buy Ticket" CTA at the bottom-right of each card is fully visible above the bottom navigation, matching the second screenshot
