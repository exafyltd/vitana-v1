
## Remove Orb Aura/Halo "Glow" on Mobile

### Problem
The mobile orb creates a "flashlight effect" that bleaches content behind it. This comes from:
1. Three external halo layers in `VitanalandPortalSeed.tsx`
2. A CSS `filter: drop-shadow()` in `index.css`
3. A `drop-shadow-lg` class in `MobileFixedOrb.tsx`

### Solution: "Readability Ring Only" for Mobile

Add a new `glowIntensity` prop to `VitanalandPortalSeed` that controls the external halos. On mobile, set it to `0` to disable all external glows while preserving internal animations.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/audio/VitanalandPortalSeed.tsx` | Add `glowIntensity` prop, conditionally render halo layers |
| `src/components/mobile/MobileFixedOrb.tsx` | Pass `glowIntensity={0}`, remove `drop-shadow-lg` class |
| `src/index.css` | Replace large drop-shadow with tight, minimal shadow |

---

### Implementation Details

#### 1. Update `VitanalandPortalSeed.tsx`

**Add new prop to interface:**
```tsx
interface VitanalandPortalSeedProps {
  audioState: 'idle' | 'listening' | 'processing' | 'error';
  volumeLevel: number;
  size?: 'sm' | 'nav' | 'md' | 'lg';
  layoutId?: string;
  glowIntensity?: number; // 0-1, default 1. 0 = no external halos
}
```

**Update component signature:**
```tsx
export function VitanalandPortalSeed({ 
  audioState, 
  volumeLevel,
  size = 'lg',
  layoutId,
  glowIntensity = 1  // Default to full glow
}: VitanalandPortalSeedProps)
```

**Conditionally render halo layers (lines 118-176):**

Wrap the three halo divs in a condition:
```tsx
{glowIntensity > 0 && (
  <>
    {/* Outer halo */}
    <motion.div ... style={{ opacity: glowIntensity }} />
    
    {/* Second halo */}
    <motion.div ... style={{ opacity: glowIntensity * 0.8 }} />
    
    {/* Thin halo ring */}
    <motion.div ... style={{ opacity: glowIntensity }} />
  </>
)}
```

This approach:
- Preserves internal orb animations (nebula clouds, aurora paths, core glow)
- Only removes the external "flashlight" halos
- Can be fine-tuned with values between 0-1 if needed later

---

#### 2. Update `MobileFixedOrb.tsx`

**Remove the `drop-shadow-lg` class and pass `glowIntensity={0}`:**

```tsx
// BEFORE (line 54)
className="cursor-pointer drop-shadow-lg"

// AFTER
className="cursor-pointer"
```

```tsx
// BEFORE (lines 56-61)
<VitanalandPortalSeed 
  audioState="idle"
  volumeLevel={0}
  size="nav"
  layoutId="vitana-orb-mobile"
/>

// AFTER
<VitanalandPortalSeed 
  audioState="idle"
  volumeLevel={0}
  size="nav"
  layoutId="vitana-orb-mobile"
  glowIntensity={0}
/>
```

---

#### 3. Update `src/index.css`

**Replace the large drop-shadow with a tight, minimal shadow (line 585):**

```css
/* BEFORE */
filter: drop-shadow(0 10px 30px rgba(0,0,0,0.25));

/* AFTER - Tight shadow for lift, no glow spread */
box-shadow: 0 2px 8px rgba(0,0,0,0.18);
outline: 1px solid rgba(255,255,255,0.12);
```

The new styling:
- Uses `box-shadow` instead of `filter: drop-shadow()` for tighter control
- Shadow spread is minimal (~8px) with low opacity
- Thin outline provides edge definition without being a visible border
- Works on both light and dark backgrounds

---

### Visual Result

| Element | Before | After |
|---------|--------|-------|
| External halos | 3 blurred layers extending 13-25px beyond orb | None |
| CSS drop-shadow | 30px blur, 10px offset | 8px blur, 2px offset |
| Orb visibility | Strong glow reduces card readability | Clean edge, visible on any background |
| Internal animations | Active | Preserved (nebula, aurora, core) |

### Acceptance Criteria

- On mobile Events feed, orb never "bleaches" the card behind it
- Orb remains clearly visible on bright and dark surfaces
- Ring is within ~2px of the orb edge
- Shadow spread is minimal (~6-10px), low opacity
- No visible border or frame added
- All internal orb animations continue working
