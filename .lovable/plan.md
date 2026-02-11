

# Make Close (X) Button Sticky in Event Detail Drawer

## Problem
The X close button is currently positioned `absolute` inside the hero image container, so it scrolls away with the content and becomes invisible when viewing ticket details or other sections below the hero.

## Solution
Move the mobile close button **outside** the ScrollArea so it floats above all scrollable content and stays visible at all times.

## Technical Details

### File: `src/components/meetups/MeetupDetailsDrawer.tsx`

**Step 1 - Remove the close button from inside the hero section (lines 686-702)**
Delete the current mobile close button block that sits inside the hero image `div`.

**Step 2 - Add a sticky close button outside the ScrollArea (after line 651)**
Place a new fixed-position close button between the `<div className="flex flex-col h-full">` wrapper and the `<ScrollArea>`, so it renders on top of the scroll content:

```tsx
{isMobile && (
  <Button
    variant="outline"
    size="icon"
    className="fixed top-4 right-4 z-[60] rounded-full bg-background/80 backdrop-blur-md shadow-md border-border/40 hover:bg-background/90 h-10 w-10"
    onClick={() => onOpenChange(false)}
    aria-label="Close event details"
    style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
  >
    <X className="h-5 w-5" />
  </Button>
)}
```

Key details:
- Uses `fixed` positioning so it stays in place regardless of scroll
- `z-[60]` ensures it sits above the ScrollArea content and the sticky bottom bar
- `style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}` respects the device safe area (notch/dynamic island)
- Same visual styling (glass background, backdrop blur, shadow) as before

