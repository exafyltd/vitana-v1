

## Fix: OAuth should always land back on `/maxina`

### Problem
OAuth `redirectTo` currently sends mobile users to `/comm/events-meetups`, bypassing the portal's `setTenantBySlug('maxina')` call. New users end up with the wrong tenant (Earthlinks) because `TenantDetector` doesn't recognize `/comm/events-meetups` as a Maxina path.

### Changes in `src/pages/portals/MaxinaPortal.tsx`

**1. Line 220 — Revert `redirectPath` to always use `/maxina`**
```typescript
// Before
const redirectPath = isMobileDevice ? '/comm/events-meetups?tab=upcoming' : '/home';

// After
const redirectPath = '/maxina';
```

**2. Line 219 — Add `localStorage.setItem('tenant_slug', 'maxina')` before the redirect**
This ensures `TopAppBar` shows "MAXINA" instantly via `getInstantTenantName` even during the loading transition.

```typescript
localStorage.setItem('tenant_slug', 'maxina');
const redirectPath = '/maxina';
```

The existing flow handles the rest correctly:
- OAuth returns to `/maxina#access_token=...`
- `isProcessingOAuth` shows spinner (no flash)
- Supabase processes tokens → `user` is set
- Redirect effect (lines 60-91) runs `setTenantBySlug('maxina')` with 5s timeout → navigates to `/comm/events-meetups` (mobile) or `/home` (desktop)

