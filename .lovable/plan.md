

## Fix Mobile Event Details: Lower Content & Hide Mute Button

### Issues Identified

1. **Mute button appearing on top**: The `MobileMuteButton` component uses `z-[9999]` which is far above the Sheet's `z-50`, causing it to always appear on top of everything.

2. **Content too high**: Need to add ~0.5cm (approximately 20px / `pt-5`) of top padding to push content down slightly.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/audio/MobileMuteButton.tsx` | Lower z-index from `z-[9999]` to `z-40` (same as Orb, below Sheet) |
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Add `pt-5` (20px) top padding to hero section on mobile |

### Implementation Details

#### 1. Fix MobileMuteButton z-index (src/components/audio/MobileMuteButton.tsx)

**Line 34:**

```tsx
// BEFORE
"fixed top-4 right-4 z-[9999]",

// AFTER
"fixed top-4 right-4 z-40",
```

This puts the mute button at the same z-level as the Orb (`z-40`), which means the Sheet (`z-50`) will naturally cover it when open.

#### 2. Add small top padding to hero (src/components/meetups/MeetupDetailsDrawer.tsx)

**Line 610:**

```tsx
// BEFORE
<div className="relative w-full aspect-video bg-muted overflow-hidden">

// AFTER  
<div className={cn(
  "relative w-full aspect-video bg-muted overflow-hidden",
  isMobile && "pt-5"
)}>
```

The `pt-5` (20px ≈ 0.5cm) will push the image content down slightly so the title/hero has proper clearance from the Appilix header bar.

### Result

- Mute button stays behind the event details sheet (hidden when sheet is open)
- X close button is unobstructed and clearly visible
- Content is lowered by ~0.5cm for proper spacing
- When closing the sheet, mute button becomes visible again

