

## Boost Orb Visibility

Two small changes to make the Orb more visible on colorful backgrounds:

### Changes

| Setting | Current | New | Purpose |
|---------|---------|-----|---------|
| Backdrop blur | 8px | 12px | Stronger frosted glass effect |
| Idle core brightness | 0.6 | 0.72 | Brighter, more alive center |

---

## Technical Details

### File: `src/components/audio/VitanalandPortalSeed.tsx`

**1. Line 94 - Idle core brightness**
```tsx
// FROM
const coreBrightness = isListening ? 0.7 + (volumeLevel * 0.25) : isProcessing ? 0.5 : 0.6;

// TO
const coreBrightness = isListening ? 0.7 + (volumeLevel * 0.25) : isProcessing ? 0.5 : 0.72;
```

**2. Lines 242-243 - Backdrop blur**
```tsx
// FROM
backdropFilter: 'blur(8px) saturate(125%)',
WebkitBackdropFilter: 'blur(8px) saturate(125%)',

// TO
backdropFilter: 'blur(12px) saturate(125%)',
WebkitBackdropFilter: 'blur(12px) saturate(125%)',
```

---

## Safety Notes
- The frosted blur stays strictly inside the Orb's circle (no light spill)
- `glowIntensity` remains 0, so no external halo or flashlight effect
- All animations and organic feel preserved

