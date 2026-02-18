

## Remove Desktop Mute Button and "Live" Indicator

### Problem
1. The floating mute button still shows on desktop, but desktop already has mute controls in the sidebar -- so it's redundant.
2. The "Live" connection status badge (green wifi icon + "Live" text) appears in the SubNavigation bar on desktop and is unnecessary clutter.

### Changes

**1. `src/components/audio/MobileMuteButton.tsx`**
- Make the component always return `null` (it was originally mobile-only, mobile now uses TopAppBar, and desktop has sidebar controls). This effectively removes the floating mute button everywhere.

**2. `src/components/SubNavigation.tsx`**
- Remove the `ConnectionStatus` component from the right-actions area
- Remove the import of `ConnectionStatus`
- Keep the `rightActions` slot intact for other uses

### What stays unchanged
- TopAppBar mute button (mobile) -- untouched
- Sidebar mute controls (desktop) -- untouched
- SubNavigation tab links and layout -- untouched
