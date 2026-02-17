
## Hide Mobile Bottom Nav During Live Sessions

### Problem
When entering a live room session on mobile, the bottom navigation bar remains visible, taking up screen space and potentially overlapping Daily.co's controls.

### Solution
Add the live room viewer route to the existing `hideNavRoutes` list in `MobileBottomNav.tsx`. The route pattern `/comm/live-rooms/` will match all live room viewer URLs (e.g., `/comm/live-rooms/abc123/view`) thanks to the existing `startsWith` check.

### Technical Details

**File: `src/components/mobile/MobileBottomNav.tsx`**
- Add `'/comm/live-rooms/'` to the `hideNavRoutes` array (between existing entries)
- This single line change hides both the bottom nav bar and the center Orb during any live session

No other files need changes -- the `startsWith` matching logic already handles sub-routes correctly.
