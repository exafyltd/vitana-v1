

## Fix: Orb Halo Glow Overriding Ring Colors

### Root Cause
`VitanalandPortalSeed.tsx` has three external halo layers (lines 120-183) that always emit **hardcoded turquoise** (`rgba(76, 200, 244, ...)`). When the soundwave rings show blue for "listening," the turquoise halo bleeds through and makes everything look turquoise. The ring colors and text colors are correct — they're just being visually overridden by the orb's own glow.

### Fix

**Edit `src/components/audio/VitanaAudioOverlay.tsx`**
- Pass `glowIntensity={0}` to `VitanalandPortalSeed` when rendered inside the overlay. The soundwave rings already serve as the external visual indicator — the orb's own halos are redundant and cause color conflicts.

This is a one-line fix. The `glowIntensity` prop already exists and already conditionally hides the halos (lines 121, 144, 165 all check `glowIntensity > 0`). We just need to use it.

