

## Move Hero Title Lower on Mobile (2mm adjustment)

### Problem

The previous fix added `pt-12` to the container, but since the container is anchored to `bottom-0`, top padding doesn't move content down - it just makes the container taller upward. The title and content stay in the same position.

### Solution

Add top margin directly to the title (`h2`) element on mobile to push it down within the container. 2mm is approximately 8px on standard displays.

### File to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Add `mt-2` (8px) margin to title on mobile |

### Implementation Details

#### MeetupDetailsDrawer.tsx (line 697)

```tsx
// BEFORE
<h2 className="text-[28px] md:text-[32px] font-bold tracking-tight text-white max-w-[22ch]" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)' }}>

// AFTER
<h2 className={cn(
  "text-[28px] md:text-[32px] font-bold tracking-tight text-white max-w-[22ch]",
  isMobile && "mt-2"
)} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 4px 16px rgba(0,0,0,0.5)' }}>
```

**What this does:**
- Adds `mt-2` (8px / ~2mm) margin above the title on mobile only
- Pushes the title down within the overlay container
- Desktop layout remains unchanged

### Visual Result

The title "Evening of Stillness - Sound Bath" will shift down by approximately 2mm, giving it more visual breathing room from the top edge of the hero area.

