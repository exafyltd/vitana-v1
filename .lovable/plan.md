

# Fix: ORB greeting "Hello Jovana" on landing page before login

## Root Cause

There's a race condition between two processes on app boot:

1. **`useOrbVoiceWidget`** calls `orb.init()` as soon as the ORB script loads. It hides the Supabase auth key but does NOT clear `vitana.authToken` / `vitana.userId` from localStorage. The external widget reads these stale keys and resolves the previous user's identity.

2. **`AuthProvider`** calls `getSession()` and clears stale ORB tokens only after the session check resolves — but by then the widget has already initialized with the stale identity.

## Fix

Two changes in `src/hooks/useOrbVoiceWidget.ts`:

### 1. Clear stale ORB identity keys before anonymous init

In the `tryInit()` function, alongside hiding the Supabase persistence key, also temporarily remove `vitana.authToken` and `vitana.userId` before calling `orb.init()`. Only restore them if the user is actually authenticated.

### 2. Guard: skip setAuth if no user

After `orb.init()`, the code unconditionally sets auth if `user && session` exist. This is fine, but the stale localStorage values are the real problem — they persist from a previous session and the external widget reads them during init.

## Changes

**File: `src/hooks/useOrbVoiceWidget.ts`** — inside `tryInit()`, before `orb.init({ showFab: true })`:

- Remove `vitana.authToken` and `vitana.userId` from localStorage (same pattern as the Supabase key suppression)
- Only set them back after init if `user && session` are present
- This ensures the external widget sees a clean anonymous state on the landing page

## No other files affected

The `AuthProvider` cleanup logic (line 127-132) is correct but arrives too late. The fix at the widget init level prevents the race entirely.

