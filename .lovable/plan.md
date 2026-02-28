

## Plan: ORB Status Soundwave Rings + Status Text

### Color Scheme (user-specified)
| State | Color | Hex |
|---|---|---|
| **Listening** | Bright blue | `#3B82F6` |
| **Talking** | Bright turquoise | `#06D6A0` |
| **Thinking** | Pastel yellow | `#FBBF24` |
| **Offline/Error/Idle** | Stronger pastel red | `#F87171` |

### Implementation

#### 1. Create `src/components/audio/OrbSoundwaveRings.tsx`
- New component rendering 4 concentric animated ring circles around the orb
- Props: `audioState`, `volumeLevel`
- Each ring is an absolutely positioned `border` circle with increasing radius, decreasing opacity (0.4 → 0.1), and staggered animation delay (0s, 0.15s, 0.3s, 0.45s)
- **Listening**: rings pulse/scale based on `volumeLevel` input, bright blue
- **Talking (speaking)**: rings ripple outward sequentially, bright turquoise
- **Thinking (processing)**: slow breathing scale animation, pastel yellow
- **Offline (idle/error)**: static rings with low opacity, pastel red
- Uses framer-motion for smooth state transitions between colors and animations

#### 2. Edit `src/components/audio/VitanaAudioOverlay.tsx`
- Wrap the `VitanalandPortalSeed` (lines 244-256) with `OrbSoundwaveRings`, passing `audioState` and `volumeLevel`
- The rings component renders as a parent container with the orb centered inside

#### 3. Edit `src/components/audio/AudioStatusText.tsx`
- Update status messages:
  - listening → "VITANA is listening..."
  - speaking → "VITANA is talking..."
  - processing → "VITANA is thinking..."
  - idle/error → "VITANA is offline"
- Color-match the text to the ring color for each state

### Files
- **Create**: `src/components/audio/OrbSoundwaveRings.tsx`
- **Edit**: `src/components/audio/VitanaAudioOverlay.tsx`
- **Edit**: `src/components/audio/AudioStatusText.tsx`

