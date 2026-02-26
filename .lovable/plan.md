

## Fix: OAuth hash processing stall causes infinite spinner

### Root Cause
The 6-second hard deadline only starts after `user` is truthy (line 69). But when `isProcessingOAuth` is true and Supabase fails to process the hash token on mobile, `user` never becomes truthy. The spinner condition (`authLoading || user || isProcessingOAuth`) keeps showing the spinner forever with no escape.

### Changes — `src/pages/portals/MaxinaPortal.tsx`

**1. Add a separate OAuth processing deadline**

Add a new effect that watches `isProcessingOAuth`. If the hash is present but no user appears within ~8 seconds, force a clean page reload (strip hash, reload `/maxina`) so Supabase gets a fresh chance to read the session from storage.

```typescript
// OAuth hash processing safety net
useEffect(() => {
  if (!isProcessingOAuth) return;
  
  const oauthDeadline = setTimeout(() => {
    if (!user && isProcessingOAuth) {
      console.warn('[MaxinaPortal] OAuth hash processing stalled, reloading');
      // Strip hash and reload — session may already be persisted
      window.location.replace('/maxina');
    }
  }, 8000);
  
  return () => clearTimeout(oauthDeadline);
}, [isProcessingOAuth, user]);
```

**2. Restructure the redirect effect guard to not silently exit when processing OAuth**

Change lines 64-67 from:
```typescript
if (!user && !isProcessingOAuth) return;
if (hasRedirectedRef.current) return;
if (!user) return;
```
To:
```typescript
if (!user) return; // single guard — deadline handles OAuth stall separately
if (hasRedirectedRef.current) return;
```

This keeps the redirect effect clean: it only fires when `user` is available, and the OAuth stall is handled by the separate safety-net effect above.

### Files to modify
- `src/pages/portals/MaxinaPortal.tsx` only

### Expected behavior after fix
- Google OAuth → returns to `/maxina#access_token=...`
- If hash processes normally (~1-3s): user set → redirect fires → lands on `/comm/events-meetups`
- If hash stalls on mobile (>8s): safety net reloads `/maxina` without hash → Supabase reads persisted session → user set → redirect fires
- No more infinite spinner

