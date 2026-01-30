

## Mobile Event Card Full-Screen Detail View

### Summary

Transform the mobile event card detail view from a 90% height sheet with navigation arrows to a **full-screen immersive experience** with a dedicated close button, removing carousel-style navigation within the detail view.

### Current Behavior

```text
+-----------------------------+
|     MAXINA Header           |
+-----------------------------+
|  Events & Meetups           |
|  ← Card →                   |  <- Navigation arrows
|  [Event Details]            |
|  [Scrollable Content]       |
|  [Sticky Action Bar]        |
+-----------------------------+
|      90vh height            |
+-----------------------------+
```

### Target Behavior

```text
+-----------------------------+
|                         [X] |  <- Close button (top-right)
|                             |
|     [Hero Image]            |
|                             |
|     [Event Title]           |
|     [Host Info]             |
|                             |
|     [Event Details]         |
|     (no internal scroll)    |
|                             |
|  [CTA Bar - Sticky Bottom]  |
+-----------------------------+
|      Full screen (100dvh)   |
+-----------------------------+
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/meetups/MeetupDetailsDrawer.tsx` | 1. Full-screen height on mobile<br/>2. Hide navigation arrows on mobile<br/>3. Add prominent close button<br/>4. Remove internal scrolling for focused view |

### Detailed Implementation

#### 1. Update Mobile Sheet to Full Screen

**Lines 1381-1384:**

```tsx
// BEFORE
<SheetContent side="bottom" className="h-[90vh] p-0">

// AFTER
<SheetContent 
  side="bottom" 
  className="h-[100dvh] p-0 rounded-none"
>
```

Using `100dvh` (dynamic viewport height) ensures proper full-screen behavior accounting for browser UI on mobile.

#### 2. Add Custom Close Button (Top Right)

Since we're hiding the navigation arrows on mobile, we'll add a dedicated close button in the hero area. This replaces the built-in Sheet close button which is positioned at top-right.

**After line 633 (hero image section), add mobile-only close button:**

```tsx
{/* Mobile Close Button - Top Right */}
{isMobile && (
  <Button
    variant="outline"
    size="icon"
    className={cn(
      "absolute top-4 right-4 z-20 rounded-full",
      "bg-background/80 backdrop-blur-md shadow-md",
      "border-border/40 hover:bg-background/90",
      "h-10 w-10"
    )}
    onClick={() => onOpenChange(false)}
    aria-label="Close event details"
  >
    <X className="h-5 w-5" />
  </Button>
)}
```

#### 3. Hide Navigation Arrows on Mobile

**Lines 634-669 (arrow buttons in hero):**

Wrap the existing navigation arrow container with a conditional render to hide on mobile:

```tsx
// BEFORE
<div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
  <Button ... ChevronLeft />
  <Button ... ChevronRight />
</div>

// AFTER
{!isMobile && (
  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
    <Button ... ChevronLeft />
    <Button ... ChevronRight />
  </div>
)}
```

#### 4. Remove Swipe Navigation on Mobile

Since the user will be focusing on a single card, we should disable the swipe-to-navigate feature on mobile. The swipe handlers are at lines 468-489.

**Lines 597-599:**

```tsx
// BEFORE
onTouchStart={onTouchStart}
onTouchMove={onTouchMove}
onTouchEnd={onTouchEnd}

// AFTER (conditional)
onTouchStart={!isMobile ? onTouchStart : undefined}
onTouchMove={!isMobile ? onTouchMove : undefined}
onTouchEnd={!isMobile ? onTouchEnd : undefined}
```

#### 5. Adjust ScrollArea for Better Focus (Optional)

The current implementation uses `<ScrollArea>` (line 601). For a focused view, we can keep scrolling enabled since event content may still exceed viewport, but optimize the layout:

```tsx
// Ensure content fits better without requiring excessive scrolling
<ScrollArea className="flex-1 pb-24"> {/* Increased padding for sticky bar */}
```

### Visual Changes Summary

| Element | Before | After |
|---------|--------|-------|
| Sheet height | `90vh` | `100dvh` (full screen) |
| Navigation arrows | Visible (prev/next) | Hidden on mobile |
| Close button | Default Sheet X | Prominent X in hero area |
| Swipe navigation | Enabled | Disabled on mobile |
| Focus | Multi-card carousel | Single card focus |

### Technical Notes

1. **Why `100dvh` instead of `100vh`**: Dynamic viewport height (`dvh`) accounts for mobile browser UI changes (address bar, navigation bar) and provides more consistent full-screen experience.

2. **Rounded corners**: Set `rounded-none` to eliminate any rounded corners for true full-screen edge-to-edge appearance.

3. **Safe area**: The sticky action bar already respects safe areas via `pb-[max(1rem,env(safe-area-inset-bottom))]` (line 1124).

4. **Desktop unchanged**: All changes are conditional on `isMobile` prop, preserving desktop behavior with navigation arrows and standard sheet appearance.

### Verification Steps

1. Open the app on mobile (or mobile preview)
2. Navigate to Events page
3. Tap on an event card
4. Verify:
   - Detail view covers full screen (no gap at top)
   - Left/right arrows are NOT visible
   - X button appears in top-right corner of hero image
   - Tapping X closes the detail and returns to card list
   - Content scrolls vertically if needed
   - Sticky action bar remains at bottom
5. Confirm desktop view still has prev/next arrows

