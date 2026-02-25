

## Fix: Make drawer navigation scrollable on small screens

### Problem

The drawer panel uses `flex-1 overflow-y-auto` on the nav items container (line 203), which should scroll. However, the drawer itself (`fixed top-0 left-0 bottom-0`) doesn't account for the device's bottom safe-area inset, so on phones with a gesture bar the last items (Profile, Log Out) get clipped behind it and appear unreachable.

### Changes — 1 file

**`src/components/mobile/SideDrawerNav.tsx`**

**Line 203** — Add bottom safe-area padding to the scrollable nav list so the last item (Log Out) clears the device gesture bar:

```tsx
// BEFORE
<div className="flex-1 overflow-y-auto py-2 px-3">

// AFTER
<div className="flex-1 overflow-y-auto py-2 px-3" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
```

This single change ensures the scroll container has enough bottom padding for the Log Out button to be fully visible and tappable, even on devices with a home indicator or gesture bar.

