

## Redesign ORB Visual Status System — Soundcloud Waves + Status Colors

### What to change

The current ORB overlay has thin halo rings around the orb that flatten the 3D effect. The user wants:
1. **Remove the ring/halo** around the orb
2. **Double the size of the colored glow cloud** behind the orb
3. **Add organic water-wave ripples** (no hard edges) radiating outward from the orb
4. **Color-code everything by state** — waves, cloud, and status text must all reflect the current mode
5. **Status text always visible** showing which mode VITANA is in

### State Color Map

| State | Color | Status Text |
|-------|-------|-------------|
| Speaking (talking) | Turquoise `#06D6A0` | "VITANA is speaking..." |
| Listening | Blue `#3B82F6` | "VITANA is listening..." |
| Processing (thinking) | Yellow `#FBBF24` | "One moment..." |
| Disconnected/Error | Red `#F87171` | "VITANA is offline" |
| Idle (connected, waiting) | Soft cyan `#4CC8F4` | "Ask VITANA..." |

### File Changes

#### 1. `src/components/audio/VitanalandPortalSeed.tsx`

**Remove hard ring elements** — Delete the "thin halo ring" layer (lines 164-184) and the "glass rim shimmer" (lines 606-621), and the inner rim layer (lines 296-302). These are the elements creating the visible ring that destroys the 3D illusion.

**Double the glow cloud size** — Increase the outer halo and second halo insets by 2x (e.g., `outerHaloInset: -50` instead of `-25` for lg size) and increase blur radii proportionally. This makes the colored cloud behind the orb appear twice as large.

**Make glow cloud color state-aware** — Currently the halos are always cyan (`rgba(76, 200, 244, ...)`). Change to use a state-driven color:
- Compute `stateColor` from `audioState` using the color map above
- Apply `stateColor` to the outer halo, second halo, and core glow layers

**Add organic water-wave ripples** — Add 3-4 concentric `motion.div` rings that expand outward from the orb center with soft box-shadows (no borders). Each ring:
- Starts at the orb edge, scales outward to 2-3x the orb size
- Fades from ~0.4 opacity to 0 as it expands
- Uses `box-shadow` with large blur (20-40px) instead of borders for soft, edgeless appearance
- Staggered animation delays for natural wave propagation feel
- Color matches the current state color
- Speed varies by state: faster pulses when speaking, slower when listening, gentle when idle

**Remove shell border** — Set `border: 'none'` on the glass shell outer layer (line 241) to eliminate the visible hard edge.

#### 2. `src/components/audio/AudioStatusText.tsx`

**Update status messages** to match the new state names and add color coding:
- idle → "Ask VITANA..." (cyan)  
- listening → "VITANA is listening..." (blue)
- processing → "One moment..." (yellow)
- speaking → "VITANA is speaking..." (turquoise)
- error → "VITANA is offline" (red)

**Add colored dot indicator** next to the text — a small pulsing circle in the state color, so the user has both text AND color feedback.

#### 3. `src/components/audio/VitanaAudioOverlay.tsx`

No structural changes needed — it already passes `audioState` and `volumeLevel` to both `VitanalandPortalSeed` and `AudioStatusText`. The visual changes propagate automatically.

### Wave Animation Details

Each water wave ring uses:
```
background: transparent
box-shadow: 0 0 {blur}px {spread}px rgba(stateColor, opacity)
border-radius: 50%
```

Animated with framer-motion:
- `scale: [1, 2.5]` — expands outward
- `opacity: [0.35, 0]` — fades as it expands  
- `duration: 3s` per wave, staggered 0.8s apart
- `repeat: Infinity`

This creates the "floating water wave" effect — soft glowing rings expanding from the orb with no hard edges, colored by state.

