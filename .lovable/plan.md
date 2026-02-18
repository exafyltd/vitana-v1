

## Move Mute Button Into the App Bar

### What changes
Replace the right spacer in the Top App Bar with an inline mute/unmute button, and remove the separate floating `MobileMuteButton` component from the layout.

### Changes

**1. `src/components/mobile/TopAppBar.tsx`**
- Import `Volume2`, `VolumeX` from lucide-react
- Import `useSoundscape` from `@/context/SoundscapeContext`
- Import `useLocation` from react-router-dom
- Replace the right `<div className="w-8 ml-auto" />` spacer with a mute toggle button
- The button uses the same `w-8 h-8` dimensions as the left menu button for symmetry
- Hide the button when in a live room (matching existing MobileMuteButton logic)
- Use a try/catch for `useSoundscape()` to handle context not being available
- Icon sizes match the menu icon (`h-5 w-5`)
- On Maxina theme: icons inherit white color; on default: use foreground/muted-foreground

**2. `src/components/audio/MobileMuteButton.tsx`**
- Remove the component entirely, or make it return `null` on mobile (since the app bar now handles it)
- Simplest: just make the component always return `null` when `isMobile` is true, preserving it for any future desktop use

### What stays unchanged
- App bar height (32px / `h-8`) -- untouched
- All carousel heights -- untouched
- MobileAppShell padding -- untouched
- Bottom nav bar -- untouched

