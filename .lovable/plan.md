
## Hide MobileMuteButton During Live Sessions

### Problem
The MobileMuteButton (fixed top-right, z-40) overlaps Daily.co's "Leave" button during active live room sessions, as visible in the screenshot.

### Solution
Add route detection to `MobileMuteButton.tsx` using `useLocation` from react-router-dom. When the current path matches a live room route (`/comm/live-rooms/` or `/community/live-rooms/` sub-routes), return `null` to hide the button entirely.

### File Changed

**`src/components/audio/MobileMuteButton.tsx`**
- Import `useLocation` from `react-router-dom`
- Add a check: if the pathname starts with `/comm/live-rooms/` or `/community/live-rooms/` (sub-routes only, not the list page), return `null`
- This reuses the same route patterns already established in `MobileBottomNav.tsx`

### Result
- During live sessions: no mute button covering Daily.co controls
- On all other screens: mute button works as before
- Desktop: unaffected (button is mobile-only already)
