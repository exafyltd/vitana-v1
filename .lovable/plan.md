
Implement the Android OAuth recovery directly in `src/pages/portals/MaxinaPortal.tsx` by updating `handleSocialLogin` exactly where the successful `signInWithOAuth` call currently leaves `loading` stuck.

Plan:
1. In `handleSocialLogin`, replace the line:
   ```ts
   // Don't reset loading — page will redirect
   ```
   with the polling block you provided, so the page checks `supabase.auth.getSession()` every second for up to 15 seconds and clears `loading` once a session appears or the timeout is reached.

2. Keep the existing `catch` behavior unchanged so real OAuth launch errors still show an error message and reset loading immediately.

3. Do not move this logic into `onAuthStateChange`; keep it inside `handleSocialLogin` to avoid async work inside the Supabase auth callback.

4. Verify the change against the current flow in this file:
   - `loading` starts as `true` before OAuth opens
   - the Android Custom Tab / external browser may not fully hand control back to the page immediately
   - the new polling gives the original page a chance to detect the restored session and stop showing the infinite “Signing in…” state

Technical note:
- The current file still has the old success path (`// Don't reset loading — page will redirect`) in `handleSocialLogin`.
- There is also a separate `visibilitychange` recovery effect later in the file. This requested fix is complementary, but if the issue still persists after this change, the next thing to inspect would be the hardcoded OAuth redirect origin (`getEmailRedirectUrl('/maxina')` currently resolves via `https://vitanaland.com`), because a redirect landing on a different origin/browser context can prevent the WebView from ever seeing the session.
