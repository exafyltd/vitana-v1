
Diagnosis:
- Do I know what the issue is? Yes.
- Google sign-in itself is still succeeding on the Supabase side. The auth logs show the full flow completing: `/authorize` -> `/callback` -> `Login` with `provider:"google"`.
- That means the breakage is client-side after the Google account picker, during session restoration/navigation back into the app.
- The most likely regression is the recent Maxina-only rewrite in `src/pages/portals/MaxinaPortal.tsx`:
  - `skipBrowserRedirect: true`
  - manual `window.location.href = data.url`
  - extra `visibilitychange` recovery + reload logic
- Maxina now behaves differently from the previously working patterns in `src/pages/Auth.tsx` and `src/pages/portals/CommunityPortal.tsx`, which still use the normal `supabase.auth.signInWithOAuth(...)` flow without the manual redirect hack.

What likely disrupted it:
1. `handleSocialLogin` in `MaxinaPortal.tsx` was changed from the standard Supabase redirect flow to a custom Appilix-specific flow.
2. That custom flow likely changed where the OAuth callback finishes, or how the WebView/browser context is preserved.
3. Once the callback returns without a restored session, Maxina’s local timeout/recovery logic eventually clears loading and drops the user back to Sign in, matching your exact symptom.

Implementation plan:
1. Restore Maxina’s OAuth entrypoint to the same simple pattern that worked before:
   - keep `tenant_slug` / `oauth_provider` storage
   - remove `skipBrowserRedirect: true`
   - remove manual `window.location.href = data.url`
   - use plain `supabase.auth.signInWithOAuth(...)` like the other working pages
2. Remove the Maxina-specific recovery behavior that was added during debugging and is now interfering:
   - remove the `visibilitychange` reload loop
   - stop using Maxina page logic as the primary OAuth recovery layer
3. Let `AuthProvider` remain the single owner of callback/session recovery:
   - it already detects `code`, hash tokens, and runs PKCE/manual recovery
   - Maxina should only show loading UI, not try to outsmart the auth layer
4. Add targeted logging in `AuthProvider` and `MaxinaPortal` around:
   - OAuth start
   - callback detection
   - `exchangeCodeForSession`
   - session found / not found
   - timeout path
   This will confirm whether the callback reaches the same context after reverting the custom redirect behavior.
5. Re-test Android end to end after the rollback:
   - tap Google
   - complete account picker
   - confirm callback reaches `/maxina`
   - confirm session is restored before the UI falls back to Sign in

Technical details:
- Evidence from code:
  - `src/pages/portals/MaxinaPortal.tsx` is the only portal using `skipBrowserRedirect: true` and `window.location.href = data.url`.
  - `src/pages/Auth.tsx` and `src/pages/portals/CommunityPortal.tsx` still use the old plain OAuth flow.
  - `MaxinaPortal.tsx` also contains extra timeout/recovery logic (`isProcessingOAuth`, `oauthTimedOut`, `visibilitychange`) that can mask the real callback failure and return the user to login.
- Evidence from logs:
  - Supabase recorded successful Google OAuth authorization and callback, so provider configuration is not the main failure.
  - The failure is after callback, before the app sees a durable session.
- Files to change:
  - `src/pages/portals/MaxinaPortal.tsx`
  - possibly small logging-only adjustments in `src/context/AuthProvider.tsx`
- Expected outcome:
  - restore the old working behavior first
  - then, if Android still needs extra help, add only a minimal non-invasive fallback rather than overriding Supabase’s redirect behavior
