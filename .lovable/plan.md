

# Fix White Gap Below CTA Bar in Mobile Event Drawer

## Problem
On Android devices, `100dvh` doesn't cover the full visible area — there's a ~72px gap at the bottom (where MobileBottomNav was) that sits outside the CSS viewport. All CSS-based approaches (fixed positioning, portals, body background) have failed to reach this area.

## Solution
Two-pronged approach:

### 1. Use `100lvh` instead of `100dvh` on the Sheet
`100lvh` (large viewport height) includes the area behind the system navigation bar, which is larger than `100dvh` on Android. Change the SheetContent class from `!h-[100dvh]` to `!h-[100lvh]`. This should make the sheet physically taller, covering the gap.

### 2. Fallback: Also set background on `<html>` element via the drawer's useEffect
If the viewport unit alone doesn't reach, set `document.documentElement.style.backgroundColor` to match the CTA bar background when the drawer is open on mobile. This ensures any remaining gap area inherits a matching color.

### 3. Increase CTA bar bottom padding
Increase the action bar's `paddingBottom` from `calc(env(safe-area-inset-bottom, 0px) + 16px)` to `calc(env(safe-area-inset-bottom, 0px) + 32px)` to extend the background further into the gap area.

## Changes in `src/components/meetups/MeetupDetailsDrawer.tsx`

1. **Line ~222-228**: In the `data-drawer-open` useEffect, add `document.documentElement.style.backgroundColor` set to the CTA bar color (`rgb(255,255,255)`) on open, and reset on close/cleanup
2. **Line ~1737**: Change `!h-[100dvh]` to `!h-[100lvh]` on SheetContent
3. **Line ~1366**: Increase paddingBottom to `calc(env(safe-area-inset-bottom, 0px) + 32px)`

## Files
- `src/components/meetups/MeetupDetailsDrawer.tsx`

