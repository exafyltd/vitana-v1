
Goal: restore the external ORB widget on Maxina intro, Maxina sign-in, and other mobile screens without regressing the auth-isolation fix.

What I found
- The ORB hook is mounted globally in `src/App.tsx` via `AppHooksInitializer`, so the widget should exist on public pages too.
- Both Maxina public screens already add the `maxina-signin-page` body class:
  - `src/pages/IntroExperience.tsx`
  - `src/pages/portals/MaxinaPortal.tsx`
- Mobile CSS already positions the ORB for those screens in `src/index.css`, so this does not look like a positioning-only bug.
- The strongest root cause is lifecycle desync:
  - `src/context/AuthProvider.tsx` destroys the widget on sign-out
  - `src/hooks/useOrbVoiceWidget.ts` still keeps `initialized.current = true`
  - after that, the hook thinks the widget still exists and skips `orb.init(...)`
  - result: no ORB on the public Maxina intro/sign-in screens, and no ORB after re-login on mobile

Implementation plan

1. Make `useOrbVoiceWidget` the single owner of widget lifecycle
- Update `src/hooks/useOrbVoiceWidget.ts` so it does not rely only on the ref.
- Before skipping init, verify the widget is still actually present/alive; if it was externally destroyed, reset `initialized.current = false`.
- On auth transitions:
  - login: ensure the widget exists, then apply `setAuth(session.access_token)`
  - logout or user switch: perform a clean destroy + anonymous re-init so the ORB stays visible on public screens
- Keep the existing “wait until auth loading is resolved” behavior.

2. Remove external destroy from auth sign-out
- In `src/context/AuthProvider.tsx`, remove the direct `orb.destroy()` call from `signOut()`.
- Keep storage cleanup (`vitana.authToken`, `vitana.userId`, `orb_*`) in place.
- This avoids the hook state and the real widget DOM getting out of sync.

3. Keep Maxina screen styling as-is unless verification shows overlap
- No route/layout changes are currently needed for:
  - `src/pages/IntroExperience.tsx`
  - `src/pages/portals/MaxinaPortal.tsx`
  - `src/index.css`
- Their existing body class + mobile bottom offset logic should work once the widget is re-created correctly.

4. Validation to run after implementation
- Mobile:
  - open Maxina intro (`/_intro/maxina`) and confirm ORB is visible
  - continue to Maxina sign-in (`/maxina`) and confirm ORB remains visible
  - sign in and confirm ORB still shows
  - sign out and confirm anonymous ORB reappears
- Desktop:
  - verify intro/sign-in still show the ORB in the expected docked position
- Regression check:
  - ensure direct chat suppression still works only when intended
  - ensure logout no longer causes permanent ORB disappearance

Technical details
```text
Current broken flow
logout
  -> AuthProvider calls orb.destroy()
  -> hook ref still says initialized=true
  -> intro/sign-in loads
  -> hook skips orb.init()
  -> no ORB anywhere

Fixed flow
logout
  -> AuthProvider clears session/storage only
  -> hook detects auth change
  -> hook owns destroy/re-init
  -> anonymous ORB is recreated for public screens
  -> login updates ORB auth normally
```

Files to change
- `src/hooks/useOrbVoiceWidget.ts`
- `src/context/AuthProvider.tsx`

Expected outcome
- ORB returns on Maxina intro and Maxina sign-in
- ORB remains available on mobile and desktop
- auth/logout behavior stays isolated without losing the widget entirely
