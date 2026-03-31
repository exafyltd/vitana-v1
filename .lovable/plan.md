

# Extend Buy Ticket Bar to Cover Bottom Nav Space

## Problem
When the event drawer opens on mobile, the bottom nav is hidden but its reserved space remains as white empty area below the Buy Ticket sticky bar. The action bar should extend to the very bottom of the screen.

## Solution
Update the sticky action bar's mobile padding to include `pb-safe` equivalent spacing, ensuring it fills the full bottom area including the system navigation/safe-area zone that the bottom nav normally occupies.

## Changes

### `src/components/meetups/MeetupDetailsDrawer.tsx`
In the sticky action bar (line ~1358), increase the mobile `paddingBottom` to account for the full safe area. Currently it uses:
```
paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)'
```
This should be sufficient, but the real issue may be that the Sheet itself doesn't extend fully. Check if the `!h-full` on SheetContent is being overridden. Change the SheetContent class to use `!h-[100dvh]` instead of `!h-full` to guarantee it covers the entire viewport including the area behind the system navigation bar, and ensure the sticky bar sits flush at the true bottom.

**Specific edits:**
1. Line ~1734: Change `!h-full` to `!h-[100dvh]` on SheetContent for guaranteed full-screen coverage
2. Line ~1363: Increase the action bar's bottom padding to `calc(env(safe-area-inset-bottom, 0px) + 16px)` for a more comfortable touch target at the very bottom edge

This is mobile-only — desktop rendering via the Drawer path is unaffected.

## Files
- `src/components/meetups/MeetupDetailsDrawer.tsx`

