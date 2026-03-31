

# Hide Bottom Nav When Event Drawer Is Open

## Problem
The MobileBottomNav (`z-50`, `fixed bottom-0`) remains visible behind/on top of the event drawer sheet (also `z-50`). The white space below the Buy Ticket bar is literally the bottom nav bar still rendering. The drawer doesn't hide it because it's route-based hiding, and the route doesn't change when the drawer opens.

## Solution
Hide the bottom nav via CSS when `data-drawer-open="true"` is set on the body (already being set by the drawer's `useEffect`). This removes the nav entirely, letting the sheet's action bar sit flush at the bottom.

## Changes

### `src/index.css`
Add a rule to hide the bottom nav when a fullscreen drawer is open:

```css
/* Hide bottom nav when fullscreen drawer is open */
body[data-drawer-open="true"] .mobile-bottom-nav {
  display: none !important;
}
```

### `src/components/mobile/MobileBottomNav.tsx`
Add a class identifier to the nav element so the CSS rule can target it. Add `mobile-bottom-nav` class to the `<motion.nav>` element.

## Files
- `src/components/mobile/MobileBottomNav.tsx` — add `mobile-bottom-nav` class
- `src/index.css` — add suppression rule

