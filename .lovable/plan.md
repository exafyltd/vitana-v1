

## Fix Mobile Orb Visual Discrepancies

### Problem Summary

The mobile Orb (`MobileFixedOrb`) displays visual artifacts not present on desktop:
1. **White frame/ring** around the orb edge
2. **Flashlight-like glow** that washes out surrounding content

### Root Cause Analysis

| Issue | Cause | Location |
|-------|-------|----------|
| White ring | The glass shell has a visible white border: `border: 1.35px solid rgba(255,255,255,0.25)` at "nav" size | `VitanalandPortalSeed.tsx` line 230 |
| Flashlight glow | Three halo layers extend 13-16px outside the orb with heavy blur (16-20px) and high opacity (0.4) | `VitanalandPortalSeed.tsx` lines 118-176 |
| Double glow | CSS adds another `drop-shadow(0 10px 30px rgba(0,0,0,0.25))` on top | `index.css` line 585 |

### Comparison

| Property | Desktop (`size="sm"`) | Mobile (`size="nav"`) |
|----------|----------------------|----------------------|
| Container | 48x48px | 60x60px |
| Outer halo inset | -10px | -13px |
| Outer blur | 14px | 16px |
| Shell border | 1px | 1.35px |
| Rim highlight | 8px | 11px |
| Rim opacity | 0.15 | 0.19 |

The "nav" size has **larger halo extensions** and **higher opacity values** than "sm", making the glow more prominent on mobile.

### Solution

Add a `glowIntensity` prop to `VitanalandPortalSeed` that allows callers to reduce or disable the external halo layers. This was previously attempted (per project memory) but appears to not be fully implemented.

---

## Technical Implementation

### 1. Update VitanalandPortalSeed Props

Add `glowIntensity` prop (0-1 range, defaults to 1):

```typescript
interface VitanalandPortalSeedProps {
  audioState: 'idle' | 'listening' | 'processing' | 'error';
  volumeLevel: number;
  size?: 'sm' | 'nav' | 'md' | 'lg';
  layoutId?: string;
  glowIntensity?: number;  // 0 = no external halos, 1 = full halos
}
```

### 2. Conditionally Render Halo Layers

When `glowIntensity === 0`, skip rendering:
- Outer halo (lines 118-137)
- Second halo (lines 139-156)
- Thin halo ring (lines 158-176)

When `0 < glowIntensity < 1`, scale opacity by the intensity value.

### 3. Update MobileFixedOrb

Pass `glowIntensity={0}` to disable flashlight effect:

```tsx
<VitanalandPortalSeed 
  audioState="idle"
  volumeLevel={0}
  size="nav"
  layoutId="vitana-orb-mobile"
  glowIntensity={0}  // No external glow on mobile
/>
```

### 4. Remove Redundant CSS Drop-Shadow

In `index.css`, remove the duplicate filter on mobile orb:

```css
/* Before */
.vitana-orb {
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.25));
}

/* After */
.vitana-orb {
  /* Remove filter - orb has its own internal shadows */
}
```

### 5. Reduce Shell Border for "nav" Size (Optional)

To eliminate the white ring, reduce the shell border to match "sm":

```typescript
nav: {
  // ...
  shellBorder: 1,     // was 1.35
  rimOpacity: 0.15,   // was 0.19
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/audio/VitanalandPortalSeed.tsx` | Add `glowIntensity` prop, conditionally render halos, optionally reduce "nav" size border/rim values |
| `src/components/mobile/MobileFixedOrb.tsx` | Pass `glowIntensity={0}` to VitanalandPortalSeed |
| `src/index.css` | Remove `filter: drop-shadow()` from `.vitana-orb` mobile styles |

---

## Result

After these changes:
- Mobile orb will match desktop visual quality (no white ring, no flashlight)
- The orb core with nebula clouds, aurora paths, and breathing animation remains fully intact
- Desktop and overlay experiences remain unchanged (they use default `glowIntensity={1}`)

