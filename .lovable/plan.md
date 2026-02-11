

# Fix "Buy Tickets" Button Hidden Behind Sticky Bar

## Problem
When scrolling down to the ticket purchase section in the mobile event detail drawer, the "Buy Tickets" / "Select Tickets" button at the bottom of the `EventTicketSelector` is partially covered by the 72px sticky action bar. On devices with a home indicator (safe area inset), the bar is even taller.

## Solution
Increase the bottom padding on the `ScrollArea` content to ensure the last interactive element (the Buy button) is fully visible above the sticky bar.

## Technical Details

### File: `src/components/meetups/MeetupDetailsDrawer.tsx` (line 651)

Change the ScrollArea bottom padding from `pb-[72px]` to `pb-[120px]` on mobile. This provides enough clearance for:
- The 72px sticky bar height
- Safe area inset (up to ~34px on newer iPhones)
- A small visual breathing room (~14px)

```
Before: <ScrollArea className={cn("flex-1", isMobile ? "pb-[72px]" : "pb-20")}>
After:  <ScrollArea className={cn("flex-1", isMobile ? "pb-[120px]" : "pb-20")}>
```

This is a single-line change that ensures the ticket purchase button and summary section are always fully visible and tappable above the sticky action bar.

