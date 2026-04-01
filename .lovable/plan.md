

# Refactor ORB widget: authToken-based init, remove setAuth calls

## Summary
The external ORB widget now supports `forceAnonymous` mode: if `init()` is called without `authToken`, subsequent `setAuth()` calls are ignored. This means authenticated screens must pass `authToken` in `init()`, and standalone `setAuth()` calls should be removed entirely.

## Changes — single file: `src/hooks/useOrbVoiceWidget.ts`

### 1. Simplify `tryInit()` (lines 23–68)
Replace the current logic (Supabase key hiding, stale key clearing, post-init `setAuth()`) with a clean branch:
- **If user + session exist**: call `orb.init({ showFab: true, authToken: session.access_token })`
- **Otherwise**: call `orb.init({ showFab: true })` (anonymous, forceAnonymous kicks in)
- Keep the `isOrbAlive()` guard for externally destroyed widgets
- Remove all localStorage manipulation (`vitana.authToken`, `vitana.userId`, Supabase key hiding) — no longer needed since `init()` handles auth directly

### 2. Replace auth sync effect (lines 84–131)
Replace the current `setAuth()`-based sync with a destroy+reinit pattern:
- Watch `user?.id` (not `session?.access_token` — avoids unnecessary reinits on token refresh)
- When `user?.id` changes and widget is initialized: `orb.destroy()` → `initialized.current = false` → reinit with or without `authToken`
- Remove `lastUserId` ref — no longer needed since the effect simply reinits on any `user?.id` change

### 3. Keep cleanup effect (lines 133–142) unchanged

### Result
- Landing page → `init({ showFab: true })` → anonymous, bulletproof (setAuth ignored)
- Post-login → `destroy()` + `init({ showFab: true, authToken })` → authenticated
- Logout → `destroy()` + `init({ showFab: true })` → back to anonymous
- No standalone `setAuth()` calls anywhere

