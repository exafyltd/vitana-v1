

## Fix Mobile Live Session View - Two Issues

### Issue 1: Bottom Nav Not Hiding (Bug Fix)

The bottom navigation bar is NOT being hidden during live sessions due to a **trailing slash bug** in the route matching logic.

The `hideNavRoutes` array contains `'/comm/live-rooms/'` (with trailing slash). The matching logic on line 52 does:

```
location.pathname.startsWith(route + '/')
```

This produces `startsWith('/comm/live-rooms//')` (double slash), which **never matches** a real path like `/comm/live-rooms/abc123/view`. The exact equality check (`===`) also fails since the pathname is longer.

**Fix**: Update the `shouldHideNav` matching logic to also handle routes that already end with `/`:

```typescript
const shouldHideNav = hideNavRoutes.some(route => 
  location.pathname === route || 
  location.pathname.startsWith(route + '/') ||
  (route.endsWith('/') && location.pathname.startsWith(route))
);
```

This keeps the list page (`/comm/live-rooms`) navigation visible while hiding it on viewer sub-routes (`/comm/live-rooms/xyz/view`).

### Issue 2: Remove SubNavigation Bar on Mobile

The "Overview | Events & MeetUps" horizontal bar is the `SubNavigation` component, rendered in `LiveRoomViewer.tsx` at two locations (lines 198 and 229). On mobile, this is redundant since the bottom nav already provides section navigation.

**Fix**: Import `useIsMobile` and conditionally render `SubNavigation` only on desktop in both render locations within `LiveRoomViewer.tsx`:

```typescript
{!isMobile && <SubNavigation items={communityNavigation} />}
```

### Files Changed

| File | Change |
|------|--------|
| `src/components/mobile/MobileBottomNav.tsx` | Fix `shouldHideNav` matching logic for trailing-slash routes |
| `src/pages/community/LiveRoomViewer.tsx` | Hide `SubNavigation` on mobile (2 locations), add `useIsMobile` import |

### Result

On mobile live sessions:
- No bottom navigation bar (more space for video)
- No "Overview / Events & MeetUps" bar (removes redundant navigation)
- Daily.co controls will be fully visible and accessible
- Desktop experience remains unchanged

