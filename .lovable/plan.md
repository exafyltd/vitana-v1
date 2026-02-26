

## Root Cause: Navigation Loop on Desktop

**MaxinaPortal** navigates authenticated desktop users to `/home` (line 87, 104, 141 in MaxinaPortal).

But **`useSmartRouting`** (line 64-65, 108) intercepts `/home` for Maxina tenant users on desktop and navigates them **back to `/maxina`**:

```
navigate(isMobileDevice ? "/comm/events-meetups?tab=upcoming" : "/maxina");
```

This creates an infinite loop:
```text
/maxina → user truthy → navigate('/home')
  → /home → useSmartRouting → navigate('/maxina')
    → /maxina → user truthy → navigate('/home')
      → ∞ endless spinner
```

On mobile it works because both MaxinaPortal and useSmartRouting agree on `/comm/events-meetups?tab=upcoming`.

## Fix

**Single change in `src/pages/portals/MaxinaPortal.tsx`**: Change the desktop redirect target from `/home` to `/comm/events-meetups?tab=upcoming` (same as mobile). This eliminates the loop since the user lands on a real content page.

Three locations to update:
1. **Line 87** (OAuth recovery): `const target = searchParams.get('redirectTo') || (isMobile ? '/comm/events-meetups?tab=upcoming' : '/home');` → remove the ternary, always use `/comm/events-meetups?tab=upcoming`
2. **Line 104** (OAuth polling fallback): same change
3. **Line 141** (main redirect effect): same change

All three become:
```typescript
const target = searchParams.get('redirectTo') || '/comm/events-meetups?tab=upcoming';
```

The `isMobile` check and `/home` target are removed entirely.

