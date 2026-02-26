
Implementation steps:

1) Update `src/pages/portals/MaxinaPortal.tsx` OAuth callback handling.
- Remove the current timeout path that calls `window.location.replace('/maxina')`.
- Add a hash-recovery effect for OAuth returns:
  - Parse `access_token` + `refresh_token` from `window.location.hash`.
  - Call `supabase.auth.setSession({ access_token, refresh_token })` when present.
  - Clear hash after successful session set (`history.replaceState`) without leaving `/maxina`.
- Keep polling as fallback, but poll for both `getSession()` and `getUser()` hydration state.
- Add an `oauthHydrating` state and do not show signin form while hydration is in progress.

2) Prevent premature redirect to protected routes.
- In `MaxinaPortal`, only navigate to app routes after authenticated user is confirmed in context (`user` truthy), not only `getSession()` truthy.
- Keep one-time guard with `hasRedirectedRef`.
- Preserve `redirectTo` query param when present; otherwise default to `/comm/events-meetups?tab=upcoming` for Maxina OAuth.

3) Make timeout behavior non-destructive.
- Replace “Tap to try again” action from hard reload to a safe in-place retry:
  - Re-run session recovery from hash/session.
  - If still unauthenticated, explicitly restart Google OAuth (`signInWithOAuth('google')`) instead of sending user to plain signin idle state.
- Keep timeout UI, but avoid any action that strips tokens before session persistence.

4) Harden `src/components/AuthGuard.tsx` against hydration race.
- Before redirecting unauthenticated users, perform a one-shot `supabase.auth.getSession()` check when `user` is null and auth just settled.
- Add a short hydration grace state so protected routes don’t bounce to signin during OAuth callback propagation.

5) Add focused diagnostics (temporary) in both files.
- Log: hash detected, setSession success/failure, session/user hydration milestones, redirect target, and guard redirect decision path.
- Remove or downgrade noisy logs after validation.

6) Validation pass (end-to-end).
- Mobile Google sign-in from Maxina: account chooser → no loop → lands on `/comm/events-meetups?tab=upcoming`.
- Tap-to-retry no longer returns to idle Maxina signin loop.
- Protected route does not bounce to `/auth` during OAuth hydration.
- Existing email/password and non-OAuth Maxina login remain unchanged.
