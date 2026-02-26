

## Problem

The 8-second OAuth safety net calls `window.location.replace('/maxina')` — a **hard page reload** that strips the `#access_token=...` hash. If Supabase hasn't finished persisting the session to storage yet (common on mobile), the reload lands on an unauthenticated sign-in screen. This is the direct cause of the "bounces back to sign-in" regression.

## Fix — `src/pages/portals/MaxinaPortal.tsx`

### 1. Replace destructive reload with active session polling

Remove the current OAuth safety net (lines 58-68) that does `window.location.replace('/maxina')`.

Replace with a new effect that, when `isProcessingOAuth` is true and `user` is null:
- Polls `supabase.auth.getSession()` every 1 second
- When a session is found, immediately navigates to the target (`/comm/events-meetups?tab=upcoming` on mobile, `/home` on desktop) — bypassing the need to wait for React state propagation
- Calls `setTenantBySlug('maxina')` in the background (fire-and-forget, non-blocking)
- After 15 seconds with no session, shows a "Something went wrong — Tap to try again" button instead of auto-reloading

### 2. Simplify the spinner guard (line 277)

Change `if (authLoading || user || isProcessingOAuth)` to track an explicit `oauthResolved` state so the spinner only shows during active processing, not indefinitely.

### 3. Keep existing redirect effect (lines 74-132) unchanged

It still handles the happy path where `onAuthStateChange` fires normally and `user` becomes available through React state.

### Technical details

```
OAuth return flow after fix:

/maxina#access_token=...
  ├─ isProcessingOAuth = true → spinner shows
  ├─ New effect starts polling getSession() every 1s
  │   ├─ Session found → navigate('/comm/events-meetups?tab=upcoming')
  │   │                   + setTenantBySlug('maxina') fire-and-forget
  │   └─ 15s timeout → show "Tap to retry" button (no auto-reload)
  └─ OR: Supabase onAuthStateChange fires → user set → existing redirect effect runs
     (whichever happens first wins via hasRedirectedRef guard)
```

Single file change: `src/pages/portals/MaxinaPortal.tsx`

