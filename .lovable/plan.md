

## Mobile Event Card Layout Adjustments

### Issues Identified

From the screenshot, there are three layout problems:

1. **Title cut off at top**: The event title "Evening of Stillness – Sound Bath" appears cut off by the MAXINA header bar (the blue area at top)
2. **Empty space below CTA**: There's visible empty space between the CTA buttons and the bottom of the screen
3. **Orb/Mute button hidden**: The Orb (which contains the soundscape mute toggle) is covered by the event sheet since the Sheet has `z-index: 50` while the Orb has `z-index: 40`

### Root Cause Analysis

The event detail sheet now uses `h-[100dvh]` (full screen height), but:
- The hero image starts at `top: 0` which means it goes under the MAXINA header bar
- The sheet's `z-index: 50` completely covers the Orb which has `z-index: 40`
- The sticky action bar has `pb-[max(1rem,env(safe-area-inset-bottom))]` but content scrolls to the edge

### Solution

| Change | Purpose |
|--------|---------|
| Add top padding to hero on mobile | Push content down to avoid header overlap |
| Elevate Orb z-index when sheet is open | Keep mute button visible above event details |
| Adjust bottom spacing | Better fit with CTA bar |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | Add mobile top padding to hero section |
| `src/index.css` | Add rule to elevate Orb z-index above sheets when event detail is open |

### Detailed Implementation

#### 1. Add Top Padding to Hero Section (MeetupDetailsDrawer.tsx)

On mobile, add top padding to push the hero image content down so the title isn't cut off by the header bar:

**Line 609 (hero container):**

```tsx
// BEFORE
<div className="relative w-full aspect-video bg-muted overflow-hidden">

// AFTER
<div className={cn(
  "relative w-full bg-muted overflow-hidden",
  isMobile ? "pt-14 min-h-[45vh]" : "aspect-video"
)}>
```

The `pt-14` (56px) accounts for the MAXINA header height, and `min-h-[45vh]` ensures the hero area remains visually prominent while allowing more content to be visible.

#### 2. Adjust Title Overlay Position

**Line 692 (title overlay):**

```tsx
// BEFORE
<div className="absolute bottom-0 left-0 right-0 p-6">

// AFTER  
<div className={cn(
  "absolute left-0 right-0 p-6",
  isMobile ? "bottom-0 pt-6" : "bottom-0"
)}>
```

#### 3. Elevate Orb Above Sheet When Event Detail is Open

Add a CSS rule so the Orb appears above the event detail sheet. We'll add a data attribute to the sheet and use CSS to elevate the orb.

**In MeetupDetailsDrawer.tsx line 1401:**

```tsx
// BEFORE
<Sheet open={open} onOpenChange={onOpenChange}>

// AFTER
<Sheet open={open} onOpenChange={onOpenChange}>
  {/* Add data attribute to body when open */}
```

Actually, a cleaner approach is to use CSS that targets when a bottom sheet is present:

**In src/index.css, add after line 586:**

```css
/* When bottom sheet is open, elevate Orb above it */
.vitana-orb[data-sheet-open="true"],
body:has([data-radix-dialog-overlay]) .vitana-orb,
body:has([data-state="open"][data-side="bottom"]) .vitana-orb {
  z-index: 60 !important; /* Above sheet (z-50) */
}
```

However, `:has()` may not be fully supported. A more reliable approach is to conditionally render the Orb at a higher z-index when the drawer is open.

**Alternative approach - Add inline style override in MeetupDetailsDrawer:**

Since the Orb is rendered globally, we can use a React Portal or body class to elevate it. The simplest solution is to add a body class when the sheet is open:

**In MeetupDetailsDrawer.tsx, add useEffect around line 530:**

```tsx
// Set body class when mobile sheet is open to elevate Orb above it
useEffect(() => {
  if (isMobile && open) {
    document.body.classList.add('event-detail-sheet-open');
    return () => {
      document.body.classList.remove('event-detail-sheet-open');
    };
  }
}, [isMobile, open]);
```

**In src/index.css, add after line 586:**

```css
/* When event detail sheet is open on mobile, elevate Orb above it */
body.event-detail-sheet-open .vitana-orb,
body.event-detail-sheet-open [data-vitana-orb="true"] {
  z-index: 60 !important; /* Above sheet (z-50), but below other modals */
}
```

#### 4. Reduce Bottom Spacing in ScrollArea

**Line 601:**

```tsx
// BEFORE
<ScrollArea className="flex-1 pb-20">

// AFTER  
<ScrollArea className={cn("flex-1", isMobile ? "pb-24" : "pb-20")}>
```

The `pb-24` (96px) on mobile ensures content doesn't get hidden behind the sticky action bar, while reducing unnecessary empty space.

### Visual Summary

```text
BEFORE:                          AFTER:
+------------------------+       +------------------------+
| MAXINA        [header] |       | MAXINA        [header] |
+-----Title cut off------+       +------------------------+
|    Sound Bath          |       |     [Top Padding]      |
|                        |       |                        |
|    [Hero Image]        |       |    [Hero Image]        |
|                        |       |                        |
|    [Content]           |       |    Title: Sound Bath   |
|                        |       |                        |
|    [Empty Space]       |       |    [Content]           |
|                        |       |                        |
| [CTA Bar] [Orb hidden] |       | [CTA Bar]              |
+------------------------+       |    [Orb visible]       |
                                 +------------------------+
```

### Verification Steps

1. Open the app on mobile
2. Navigate to Events page
3. Tap on an event card
4. Verify:
   - Event title is fully visible (not cut off by header)
   - Hero image has proper top padding
   - X close button is clearly visible in top-right
   - Orb/mute button is visible below the event details
   - CTA buttons are at the bottom with minimal empty space below
   - Content scrolls smoothly
5. Tap the Orb to confirm it's interactive
6. Close the event detail and verify Orb returns to normal z-index

