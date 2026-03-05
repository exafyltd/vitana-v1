

## Apple Rejection Fix: iPad Apple Sign-In Infinite Spinner

### Files to Edit (4 files)

#### 1. `src/integrations/supabase/client.ts`
Add `detectSessionInUrl: true` explicitly to auth config for clarity and regression safety.

#### 2. `src/context/AuthProvider.tsx`
After the existing `getSession()` call (line 36-40), add OAuth callback recovery:

- **Hash token detection**: If `window.location.hash` contains `access_token` + `refresh_token`, parse them and call `supabase.auth.setSession()`. On success, clear hash via `history.replaceState`.
- **PKCE code detection**: If `window.location.search` contains `code` param (or hash contains `code`), call `supabase.auth.exchangeCodeForSession(code)`. On success, clear the query/hash.
- **Fallback**: If setSession/exchangeCode fails, call `supabase.auth.refreshSession()` then `getSession()`.
- All recovery runs only once (guard with a ref). On success, update user/session state directly.

#### 3. `src/components/AuthGuard.tsx`
Replace the current infinite-spinner approach with a state machine:

- **Detect OAuth callback**: Check for `access_token` in hash OR `code` in query/hash.
- **Processing state with 8s timeout**: When OAuth callback detected, enter `processing` state. Start a timer.
- **Active recovery during processing**: 
  - Attempt `getSession()` every 1s (polling, not 500ms per user request).
  - If hash tokens found, attempt `setSession()`.
  - If PKCE `code` found, attempt `exchangeCodeForSession()`.
  - Clear hash/query after processing.
- **Timeout → recovery UI**: After 8s with no session, show recovery screen:
  - "Try Apple Sign-In again" button — re-initiates OAuth
  - "Back to login" button — navigates to `/maxina` (or tenant-appropriate portal via `localStorage.tenant_slug`)
- **Success**: Once session found, clear callback params and render children normally.

#### 4. `src/pages/portals/MaxinaPortal.tsx`
Minor hardening to existing OAuth recovery (lines 61-124):

- Add PKCE `code` detection alongside hash token detection. If `code` param found in `window.location.search`, call `exchangeCodeForSession(code)` before falling back to polling.
- Add `refreshSession()` as fallback after `setSession()` fails.
- Keep polling at 1s (already 1s, no change needed).
- In the timeout retry UI (lines 364-396), add a "Back to login" button alongside existing "Tap to try again" that navigates to `/maxina` and clears OAuth state.

### Flow Summary

```text
OAuth redirect lands on app
  │
  ├─ AuthProvider detects hash tokens or PKCE code
  │   └─ setSession() / exchangeCodeForSession() → state hydrated
  │
  ├─ AuthGuard (if protected route)
  │   ├─ Detects callback params → enters "processing" state
  │   ├─ Polls getSession() every 1s + attempts token/code recovery
  │   ├─ Success within 8s → render children
  │   └─ Timeout → show "Try again" + "Back to login"
  │
  └─ MaxinaPortal (if /maxina route)
      ├─ Existing recovery logic + PKCE code support
      ├─ refreshSession() fallback
      └─ Timeout → "Try again" + "Back to login"
```

### Acceptance Criteria
- iPad Safari/WebView: Apple Sign-In completes, session hydrates, app loads — no infinite spinner
- PKCE code-flow callbacks handled in addition to implicit hash-flow
- Max 8s before recovery UI appears with both actions
- Hash/query fragments cleared after processing
- iPhone flow unchanged (already works)
- 1s polling interval maintained

