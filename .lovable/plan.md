

# Fix: Mobile Users Should Never See Community Overview Screen

## Problem Summary
The screenshot shows mobile users are seeing an inconsistent "Community Overview" screen at `/comm` that doesn't match the established mobile UI patterns (Mobile Top Block, proper event cards, etc.). This screen shows:
- Desktop-style `MobileCommunityNav` with "Overview" and "Events & MeetUps" tabs
- A simplified header with entry cards
- The 3-card header pattern (Autopilot, Vitana Index) that belongs on desktop

**User Requirement**: Mobile home = `/comm/events-meetups?tab=upcoming`. No Community Overview screen on mobile.

## Root Cause
`Community.tsx` (lines 1216-1283) has a mobile-specific rendering path that displays a simplified Community dashboard instead of redirecting mobile users directly to the Events page.

## Solution
Add an immediate redirect at the top of `Community.tsx` so mobile users accessing `/comm` are instantly sent to `/comm/events-meetups?tab=upcoming`.

## Technical Implementation

### File: `src/pages/Community.tsx`

Add redirect logic early in the component (before any heavy rendering):

```typescript
// At top of component, after hooks
const isMobile = useIsMobile();
const navigate = useNavigate();

// Mobile users should never see /comm - redirect to Events
useEffect(() => {
  if (isMobile) {
    navigate('/comm/events-meetups?tab=upcoming', { replace: true });
  }
}, [isMobile, navigate]);

// Prevent flash: return null while redirecting on mobile
if (isMobile) {
  return null;
}
```

This ensures:
1. **No visual flash** - Returns `null` immediately for mobile users
2. **Clean history** - Uses `{ replace: true }` to prevent back-button loops
3. **Works for all entry points** - Sidebar links, direct URL, OAuth redirects, etc.
4. **Desktop unchanged** - Only affects mobile users

## Data Flow After Fix

```text
Mobile User → /comm (any source)
      ↓
Community.tsx mounts
      ↓
useIsMobile() returns true
      ↓
Component returns null (no render)
      ↓
useEffect triggers navigate()
      ↓
/comm/events-meetups?tab=upcoming renders
      ↓
Proper mobile Events layout with cached data
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Community.tsx` | Add mobile redirect `useEffect` + early `return null` guard |

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Back button | `replace: true` prevents redirect loop |
| Direct URL `/comm` | Redirects immediately |
| Sidebar link to Community | Redirects immediately |
| OAuth login flow | Works with existing prefetch flow |
| Desktop users | No change - full Community overview |
| SSR/hydration | `useIsMobile()` handles initial state |

## Cleanup Opportunity (Optional)
After this fix, the entire mobile rendering block in `Community.tsx` (lines 1216-1283) becomes dead code and can be safely removed in a future cleanup, since mobile users will never reach that code path.

