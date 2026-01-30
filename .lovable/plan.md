

## Eliminate Mobile Orb Flashlight Effect via `glowIntensity` Prop

### Problem

The Orb's halo/aura layers in `VitanalandPortalSeed` create a "flashlight" effect on mobile, washing out surrounding content. Despite previous parameter tuning, the effect persists because the halo layers still render.

### Solution

Add a `glowIntensity` prop (0-1 range) to `VitanalandPortalSeed` that controls halo visibility:
- `0` = No halos rendered (completely disabled)
- `1` = Full halos (default, for desktop)
- Values in between = Scaled opacity

### Files to Modify

| File | Change |
|------|--------|
| `src/components/audio/VitanalandPortalSeed.tsx` | Add `glowIntensity` prop, conditionally render halos |
| `src/components/mobile/MobileFixedOrb.tsx` | Pass `glowIntensity={0}` to disable halos |

### Implementation Details

#### 1. VitanalandPortalSeed.tsx

**Add prop to interface (lines 3-8):**

```tsx
interface VitanalandPortalSeedProps {
  audioState: 'idle' | 'listening' | 'processing' | 'error';
  volumeLevel: number;
  size?: 'sm' | 'nav' | 'md' | 'lg';
  layoutId?: string;
  glowIntensity?: number; // 0 = no halos, 1 = full halos (default)
}
```

**Add default in function signature (lines 10-15):**

```tsx
export function VitanalandPortalSeed({ 
  audioState, 
  volumeLevel,
  size = 'lg',
  layoutId,
  glowIntensity = 1  // Default to full glow
}: VitanalandPortalSeedProps) {
```

**Conditionally render halo layers (lines 128-186):**

Wrap the three halo divs in a conditional check:

```tsx
{/* Only render halos if glowIntensity > 0 */}
{glowIntensity > 0 && (
  <>
    {/* Outer halo */}
    <motion.div
      style={{
        // ... existing styles
        opacity: config.outerHaloOpacity * glowIntensity,
      }}
      // ... existing animation
    />

    {/* Second halo layer */}
    <motion.div
      style={{
        // ... existing styles  
        opacity: config.secondHaloOpacity * glowIntensity,
      }}
      // ... existing animation
    />

    {/* Thin halo ring */}
    <motion.div
      // ... existing code
    />
  </>
)}
```

#### 2. MobileFixedOrb.tsx

**Pass glowIntensity={0} (line 56-61):**

```tsx
<VitanalandPortalSeed 
  audioState="idle"
  volumeLevel={0}
  size="nav"
  layoutId="vitana-orb-mobile"
  glowIntensity={0}  // Disable halos on mobile nav orb
/>
```

### What Gets Removed vs. Kept

| Layer | With `glowIntensity={0}` | Purpose |
|-------|--------------------------|---------|
| Outer halo | Removed | Main "flashlight" culprit |
| Second halo | Removed | Depth layer, adds to wash-out |
| Thin ring | Removed | Edge glow |
| Glass shell | **Kept** | Orb structure |
| Nebula clouds | **Kept** | Internal animation |
| Aurora paths | **Kept** | Signature visual |
| Core glow | **Kept** | Center brightness |
| Specular highlights | **Kept** | Glass reflections |

### Visual Result

```text
BEFORE (glowIntensity=1):
┌─────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← Halos wash out content
│  ░░░░░░╭──────────╮░░░░░░░░░░  │
│  ░░░░░░│ ◉ ORB    │░░░░░░░░░░  │
│  ░░░░░░╰──────────╯░░░░░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────┘

AFTER (glowIntensity=0):
┌─────────────────────────────────┐
│  Content clearly visible        │
│         ╭──────────╮            │
│         │ ◉ ORB    │            │  ← Orb core + glass shell only
│         ╰──────────╯            │
│  Content clearly visible        │
└─────────────────────────────────┘
```

### Verification

1. Open mobile preview on `/home`
2. Confirm the Orb is visible and recognizable
3. Confirm NO glow/aura extends beyond the orb edge
4. Confirm surrounding content (cards, text) is fully readable
5. Tap the orb to ensure it still responds and animates correctly
6. Verify desktop orb still has full glow (no regression)

