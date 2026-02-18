

## Add Swipe-Right Gesture to Open Side Drawer

### What changes
Add a touch swipe-right gesture detector to `MobileAppShell` so users can drag from the left edge of the screen to open the navigation drawer, in addition to the existing kebab menu button.

### Implementation

**`src/components/mobile/MobileAppShell.tsx`**

Add `onTouchStart` / `onTouchEnd` handlers to the content wrapper that detect a horizontal right-swipe gesture:

- On `touchstart`: record the starting X and Y coordinates.
- On `touchend`: compute deltaX and deltaY. If the swipe started within ~30px of the left edge, moved right by at least 50px, and the horizontal distance exceeds the vertical distance (to avoid interfering with scrolling), open the drawer.
- This keeps it simple with no extra dependencies -- just native touch events and a `useRef` for the start coordinates.

### What stays unchanged
- Drawer component (`SideDrawerNav`) -- untouched
- Kebab menu button still works as before
- Desktop behavior unaffected (component returns early for non-mobile)
- Drawer close behavior (backdrop tap, X button) unchanged

