

# Fix: Google Sign-In Stuck on Android + Build Errors

## Problems

### 1. Build errors blocking deployment
`avatar_offset_x` and `avatar_offset_y` are referenced in `IdentityForm.tsx` and `ProfileProvider.tsx` but do not exist in the `profiles` table. This causes TypeScript build failures, which means the latest code changes may not be deploying correctly.

### 2. Google sign-in stuck on Android
After the recent AuthProvider diff, the `onAuthStateChange` handler changed how it decides to keep `loading=true`:

**Before:** Checked `oauthRecoveryPending.current` (a mutable ref — always reflects current state)
**After:** Checks `hasOAuthCallback` (a closure variable captured once at mount)

The new logic is actually more correct for preventing premature login redirects. However, the endless "Signing in..." on Android is likely caused by the OAuth flow opening in an external browser or Custom Chrome Tab (Appilix WebView behavior), where:
- The original WebView page sets `loading=true` on the sign-in button
- Google OAuth opens externally
- After account selection, the redirect goes to the external browser, not back to the WebView
- The user returns to the app manually, seeing the page still stuck at "Signing in..."

Even if the redirect does come back to the WebView, there may be a race where the SDK's `detectSessionInUrl` and the manual PKCE recovery compete, both failing to exchange the code.

## Plan

### Step 1: Add missing database columns
Create a migration to add `avatar_offset_x` and `avatar_offset_y` columns to the `profiles` table. This fixes the build errors immediately.

### Step 2: Add `visibilitychange` session recovery in MaxinaPortal
When the app regains focus after an external OAuth flow, check for a session and reset loading state. This handles the Android WebView case where the redirect lands in the external browser.

**In `MaxinaPortal.tsx`**, add a `visibilitychange` listener:
- When document becomes visible and local `loading` is true, call `supabase.auth.getSession()`
- If a session exists, reset `loading=false` and let the existing redirect logic handle navigation
- If no session after 3 attempts (1s apart), reset `loading=false` so the user can retry

### Step 3: Harden AuthProvider's onAuthStateChange handler
Add a secondary safety check: if `onAuthStateChange` fires with a non-null session at any point (regardless of `hasOAuthCallback`), always set `loading=false`. This is already the case in the current code (`if (session?.user)` branch), but we should also handle the edge case where the SDK fires `TOKEN_REFRESHED` before `SIGNED_IN`.

No change needed here — the current code already handles this correctly. The 15s safety timeout also serves as a backstop.

### Files changed
- **Database migration**: Add `avatar_offset_x` and `avatar_offset_y` to `profiles`
- **`src/pages/portals/MaxinaPortal.tsx`**: Add `visibilitychange` listener for session recovery when returning from external OAuth

