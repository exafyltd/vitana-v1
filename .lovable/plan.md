

## Fix: Mobile Google Sign-In Endless Loading

**Problem:** OAuth `redirectTo` is set to `/maxina` (line 217). After Google auth, the user lands back on the portal page, which must process the hash tokens, switch tenant, prefetch events, and then navigate. This chain stalls on mobile, causing endless loading. Previously it worked because OAuth landed directly on `/comm/events-meetups`.

**Root cause:** The `redirectTo` was changed from the destination route to `/maxina` in a previous fix attempt. The portal's redirect effect (lines 60-91) runs `setTenantBySlug` + prefetch in `Promise.all` with no timeout — if either hangs, `navigate()` never fires.

### Changes in `src/pages/portals/MaxinaPortal.tsx`

**1. Revert `redirectTo` to land directly on destination (line 217)**
```typescript
// Before
const redirectPath = '/maxina';

// After
const isMobileDevice = window.innerWidth < 768;
const redirectPath = isMobileDevice ? '/comm/events-meetups?tab=upcoming' : '/home';
```

This bypasses the portal's fragile redirect chain entirely. The hash-aware `AuthGuard` (already in place) prevents premature `/auth` redirects while Supabase processes the tokens.

**2. Add 5-second timeout to the redirect effect (lines 82-88) as a safety net**
```typescript
// Wrap Promise.all with Promise.race timeout
const timeout = new Promise(resolve => setTimeout(resolve, 5000));
const setup = Promise.all([
  prefetchPromise,
  setTenantBySlug('maxina')
]).catch(err => console.warn('[MaxinaPortal] Setup error:', err));

await Promise.race([setup, timeout]);
navigate(redirectTo || defaultRedirect);
```

This ensures that even if a user lands on `/maxina` (e.g., via direct navigation after login), the redirect fires within 5 seconds regardless of tenant switch or prefetch status.

