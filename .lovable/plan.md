

## ORB Voice Widget — Step 2: Wire Click Handlers

Based on code review, here are the changes needed:

### Changes Required

**1. src/components/mobile/MobileBottomNav.tsx** (lines 62-65)
Replace `handleOrbClick` body:
```typescript
const handleOrbClick = () => {
  playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
  const orb = (window as any).VitanaOrb;
  if (orb && orb.show) {
    orb.show();
  }
};
```

**2. src/components/vitanaland/VitanaButton.tsx** (lines 29-32)
Replace `handleOrbClick` body:
```typescript
const handleOrbClick = () => {
  playSound("/sounds/vitanaland/spark-chime.mp3", 0.12);
  const orb = (window as any).VitanaOrb;
  if (orb && orb.show) {
    orb.show();
  }
};
```

**3. src/components/vitanaland/PersistentGuideOrb.tsx** (line 23)
Replace ONLY the `expandToFull();` line inside setTimeout:
```typescript
setTimeout(() => {
  const orb = (window as any).VitanaOrb; if (orb && orb.show) { orb.show(); }
}, 200);
```

### Files Already Updated (No Changes Needed)
- **src/pages/portals/MaxinaPortal.tsx** — Already has `VitanaOrb.show()` pattern
- **src/pages/IntroExperience.tsx** — Already has `VitanaOrb.show()` pattern

### What Stays Unchanged
- All imports remain (including `useVitanalandNavigation`, `expandToFull`, etc.)
- All component signatures and props remain intact
- All context providers remain in place
- All existing code structure preserved

