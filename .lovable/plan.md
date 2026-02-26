

## Fix: Google Sign-In on Maxina Redirects to /auth

**Problem:** After Google OAuth, Supabase redirects to `/home` (line 219). `/home` is wrapped in `AuthGuard`, which sees `user=null` (hash tokens not yet processed) and redirects to `/auth`.

**Two changes, both in Maxina scope only:**

### 1. Update `AuthGuard.tsx` — detect OAuth hash tokens
Before redirecting to `/auth`, check if `window.location.hash` contains `access_token`. If so, show spinner instead of redirecting — Supabase is still processing the callback.

### 2. Update `MaxinaPortal.tsx` line 217-219 — change OAuth redirectTo
Change the OAuth `redirectTo` from `/home` (protected) to `/maxina` (unprotected, already handles auth state and redirects authenticated users). This way the callback never hits `AuthGuard` at all.

```
// Before
const redirectPath = isMobile ? '/comm/events-meetups?tab=upcoming' : '/home';

// After  
const redirectPath = '/maxina';
```

The Maxina portal page already has logic (line 238: `if (authLoading || user)`) that shows a loading spinner and then `useSmartRouting` handles routing the authenticated user to the correct destination (mobile → events, desktop → home).

