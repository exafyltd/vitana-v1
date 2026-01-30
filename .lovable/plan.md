

## Move Hero Title and Content Lower on Mobile

### Problem Analysis

Looking at the screenshot, the event title "Evening of Stillness – Sound Bath" is positioned too close to the top of the hero area, making it appear cut off or cramped. The title, host chip, and follow button all need more breathing room from the top.

The current code positions the title overlay at `bottom-0` of the hero image container, which works well when the image has proper aspect ratio. However, since we now use `!inset-0 !h-full` for the full viewport, the visual balance is off.

### Solution

Add top padding to the title overlay container on mobile to push the text content down, giving it visual breathing room and preventing the "cut off" appearance.

### File to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Add top padding to the title overlay on mobile |

### Implementation Details

#### MeetupDetailsDrawer.tsx (lines 693-696)

```tsx
// BEFORE
<div className={cn(
  "absolute left-0 right-0 p-6",
  isMobile ? "bottom-0 pt-6" : "bottom-0"
)}>

// AFTER
<div className={cn(
  "absolute left-0 right-0 p-6",
  isMobile ? "bottom-0 pt-12" : "bottom-0"
)}>
```

**What this does:**
- Changes `pt-6` (24px) to `pt-12` (48px) on mobile
- This pushes the title, host bar, and follow button down by an additional 24px
- Creates better visual balance with the top of the viewport
- Ensures the title doesn't appear clipped against the edge

### Alternative: Add Safe Area Top Offset

If we want to be more precise about the spacing, we could also add safe-area awareness:

```tsx
isMobile ? "bottom-0 pt-[calc(env(safe-area-inset-top,0px)+48px)]" : "bottom-0"
```

This accounts for any notch or status bar area in addition to the visual padding.

### Visual Result

```text
BEFORE:                         AFTER:
+----------------------+        +----------------------+
| Evening of Still...  |  <-    |                      |
|    (cramped)         |        |                      |
|                      |        | Evening of Stillness |
| [Host] [Follow]      |        |   – Sound Bath       |
+----------------------+        | [Host] [Follow]      |
|                      |        +----------------------+
```

After this change:
- Title has more breathing room from the top
- Text no longer appears cut off
- Better visual hierarchy and composition
- Consistent with premium mobile UX patterns

