

# Mobile Home Screen → Events Page (Always)

## Overview
Update the OAuth redirect logic to use **actual mobile detection** (`window.innerWidth < 768`) instead of relying on the `app=1` query parameter. This ensures mobile users are always redirected to the events page after Google/Apple sign-in.

## Root Cause
The current implementation only checks for `app=1` query parameter, which requires the Appilix drawer to pass this parameter. Instead, we should detect mobile directly using screen width.

## Technical Implementation

### Modify `handleSocialLogin` in MaxinaPortal.tsx
**File:** `src/pages/portals/MaxinaPortal.tsx`

**Current Logic (lines 183-187):**
```typescript
const isAppContext = searchParams.get('app') === '1';
const redirectPath = isAppContext 
  ? '/comm/events-meetups?tab=upcoming' 
  : '/home';
```

**Updated Logic:**
```typescript
// Detect mobile via screen width (matches useIsMobile hook breakpoint)
const isMobile = window.innerWidth < 768;
const redirectPath = isMobile 
  ? '/comm/events-meetups?tab=upcoming' 
  : '/home';
```

## Redirect Flow After Fix

```text
Mobile (any device < 768px):
  /maxina → OAuth → /comm/events-meetups?tab=upcoming

Desktop (≥ 768px):
  /maxina → OAuth → /home
```

## Consistency Check
This now matches the existing post-login redirect logic already in the same file (lines 59-61):
```typescript
const isMobile = window.innerWidth < 768;
const defaultRedirect = isMobile ? '/comm/events-meetups?tab=upcoming' : '/home';
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/portals/MaxinaPortal.tsx` | Replace `app=1` check with `window.innerWidth < 768` in `handleSocialLogin` |

## Implementation Notes
- Uses same 768px breakpoint as `useIsMobile` hook
- No dependency on query parameters
- Desktop behavior unchanged (still goes to `/home`)
- Works for both OAuth providers (Google and Apple)

