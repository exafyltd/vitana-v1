
Diagnosis

- No, this does not look like a reverted deployment.
- The new ORB logic is still present in `src/hooks/useOrbVoiceWidget.ts`.
- The real problem is that a second, older ORB auth path is still active in `src/context/AuthProvider.tsx`.

What is happening

- `useOrbVoiceWidget.ts` now uses the correct new model:
  - anonymous: `orb.init({ showFab: true })`
  - authenticated: `orb.init({ showFab: true, authToken })`
  - login/logout: `destroy()` + reinit
- But `AuthProvider.tsx` still has legacy code:
  - `syncOrbAuth(session)`
  - writes `vitana.authToken` and `vitana.userId` into `localStorage`
  - calls `orb.updateAuth(...)`
- That legacy code runs on both:
  - `SIGNED_IN`
  - `TOKEN_REFRESHED`

Why it broke “5 minutes later”

- Your Supabase client has `autoRefreshToken: true`.
- That means a background token refresh happens automatically after some time.
- When that refresh fires, `AuthProvider` runs the old ORB sync again.
- So the widget gets re-touched by the legacy auth path and appears to “go back” to the old behavior.

So the issue is:
- not a rollback
- not a reverted deployment
- but two competing ORB auth systems running at once, with the old one waking up later during token refresh

Fix plan

1. Remove the legacy ORB auth sync from `src/context/AuthProvider.tsx`
   - delete `syncOrbAuth(session)`
   - stop writing `vitana.authToken`
   - stop writing `vitana.userId`
   - stop calling `orb.updateAuth(...)`

2. Keep ORB auth ownership in one place only
   - `src/hooks/useOrbVoiceWidget.ts` should be the only file that initializes/reinitializes the widget

3. Keep only cleanup behavior in `AuthProvider`
   - clearing ORB storage on sign-out or user switch is fine
   - but no active auth syncing from there

4. Re-test the exact failure sequence
   - open `/maxina` anonymous
   - verify ORB is anonymous
   - sign in and verify authenticated widget
   - wait long enough for token refresh / reload
   - verify it does not silently revert
   - sign out and verify anonymous again

Files involved

- `src/hooks/useOrbVoiceWidget.ts` — correct new approach is already there
- `src/context/AuthProvider.tsx` — conflicting legacy path is still causing the regression
