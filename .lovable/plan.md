

## Remove Flashlight/Glow Effect from Mobile Orb

### Problem Analysis

The screenshot shows a prominent glow/flashlight effect emanating from the Orb at the bottom of the screen. This effect is covering the "Platz reservieren" button and surrounding content.

The glow is caused by **four separate sources**:

| Source | Location | Effect |
|--------|----------|--------|
| **1. Aura Layer** | `MobileBottomNav.tsx` lines 82-94 | 120x120px radial-gradient with blur(16px) behind orb |
| **2. Drop Shadow Filter** | `MobileBottomNav.tsx` line 123 | Double drop-shadow filter on orb container |
| **3. Drop Shadow Class** | `MobileFixedOrb.tsx` line 54 | Tailwind `drop-shadow-lg` class |
| **4. Internal Box-Shadows** | `VitanalandPortalSeed.tsx` | Shell glow (line 235-237) and core bloom (line 477) not respecting `glowIntensity={0}` |

---

## Solution

### Step 1: Remove External Aura Layer

Delete the large radial-gradient div in `MobileBottomNav.tsx` (lines 82-94) that creates the background glow effect.

### Step 2: Remove Drop Shadow Filters

**In `MobileBottomNav.tsx`** (line 122-124):
Remove the inline `filter` style that adds drop shadows to the orb container.

**In `MobileFixedOrb.tsx`** (line 54):
Remove the `drop-shadow-lg` class from the button wrapper.

### Step 3: Disable Internal Glow When glowIntensity=0

**In `VitanalandPortalSeed.tsx`**, modify the component to respect `glowIntensity={0}`:

**Shell Box-Shadow** (lines 235-237):
```tsx
// Change from:
boxShadow: `0 0 ${config.rimHighlight}px rgba(76, 200, 244, 0.4), ...`

// To:
boxShadow: glowIntensity > 0 
  ? `0 0 ${config.rimHighlight}px rgba(76, 200, 244, 0.4), ...`
  : 'inset 0 0 40px rgba(0, 0, 0, 0.15)'  // Subtle inset only
```

**Outer Core Bloom** (line 477):
```tsx
// Change from:
boxShadow: `0 0 ${60 * config.nebulaScale}px rgba(76, 200, 244, 0.9), ...`

// To:
boxShadow: glowIntensity > 0
  ? `0 0 ${60 * config.nebulaScale}px rgba(76, 200, 244, 0.9), ...`
  : 'none'
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/mobile/MobileBottomNav.tsx` | Remove aura layer div (lines 82-94), remove drop-shadow filter (line 123) |
| `src/components/mobile/MobileFixedOrb.tsx` | Remove `drop-shadow-lg` class |
| `src/components/audio/VitanalandPortalSeed.tsx` | Make shell and core `boxShadow` conditional on `glowIntensity > 0` |

---

## Expected Result

After these changes:
- The Orb will appear as a clean, static sphere without external light emission
- Surrounding content (like "Platz reservieren" button) will be fully visible and unobstructed
- The Orb remains visually appealing with internal gradients and subtle animations, but without the "flashlight" glow bleeding outward
- The `glowIntensity={0}` prop will now properly disable ALL external glow sources

