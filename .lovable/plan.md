

## Problem

On mobile, after Google OAuth redirects back to `/maxina#access_token=...`, there's a brief window where `authLoading=false` and `user=null` (hash tokens not yet processed by Supabase). The portal's guard at line 235 (`if (authLoading || user)`) fails, so the sign-in form renders instead of the loading spinner. The user gets stuck on the sign-in page.

On desktop this works because the timing is slightly different or the page processes faster.

## Fix: One change in `MaxinaPortal.tsx`

**Make the portal page hash-aware**, same pattern as AuthGuard:

At the top of the component (around line 38), add:
```typescript
const isProcessingOAuth = window.location.hash.includes('access_token');
```

Then change line 235 from:
```typescript
if (authLoading || user) {
```
to:
```typescript
if (authLoading || user || isProcessingOAuth) {
```

This ensures that when OAuth redirects back with hash tokens, the portal shows the loading spinner (with the video background) instead of the sign-in form, giving `onAuthStateChange` time to process the tokens and set `user`, which then triggers the existing redirect logic at line 59-91.

