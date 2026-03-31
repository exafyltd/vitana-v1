

# Fix: ORB Widget Greeting "Hello Jovana" on Landing Page

## Root Cause (Confirmed via Browser Testing)

The external ORB widget (`orb-widget.js`) reads `vitana.authToken` from `localStorage` on **every page**, including the anonymous landing/intro page. When a previous user (Jovana) was logged in, that token persists in `localStorage` even after:
- Session expiry (no explicit signOut)
- Browser close/reopen
- Navigating to the landing page

The gateway receives this stale token, extracts the user ID, bootstraps Jovana's context (2301 chars of memories/diary), and greets with "Hello Jovana" — even though no one is logged in, or Alex is now logged in.

The `clearOrbSessionState()` function only runs on explicit `signOut()`. It never runs on session expiry or page load validation.

## Fix (2 changes)

### 1. Validate ORB auth token on every app boot
**File: `src/context/AuthProvider.tsx`**

After `getSession()` resolves, add a check: if there is NO active Supabase session but `vitana.authToken` exists in localStorage, clear all ORB keys immediately. This catches the case where a previous user's token lingers after session expiry or browser restart.

```
// Inside the getSession() callback, after setUser/setLoading:
if (!existingSession) {
  // No active session — purge any stale ORB auth to prevent
  // the external widget from using a previous user's identity
  const staleOrbToken = localStorage.getItem('vitana.authToken');
  if (staleOrbToken) {
    console.log('[AuthProvider] No session but stale ORB token found — clearing');
    clearOrbSessionState();
  }
}
```

Also add the same check in the `onAuthStateChange` handler for `SIGNED_OUT` (already done) and for the case where session becomes null without an explicit SIGNED_OUT event.

### 2. Sync ORB auth on TOKEN_REFRESHED to keep token current
**File: `src/context/AuthProvider.tsx`**

Already done — `syncOrbAuth(session)` is called on `SIGNED_IN` and `TOKEN_REFRESHED`. No change needed here.

### 3. Clear stale Supabase session tokens on landing page
**File: `src/hooks/useOrbVoiceWidget.ts`**

Before calling `orb.init()`, check if there's a valid Supabase session. If not, proactively clear `vitana.authToken` and `vitana.userId` from localStorage so the widget initializes in anonymous mode:

```
// Before init:
import { supabase } from "@/integrations/supabase/client";

// In tryInit():
// If no authenticated user, ensure ORB keys are clean
if (!user) {
  localStorage.removeItem('vitana.authToken');
  localStorage.removeItem('vitana.userId');
}
orb.init({ showFab: true });
```

This requires passing the `user` state into the init logic, which the hook already has access to via `useAuth()`.

## Files to change
1. `src/context/AuthProvider.tsx` — clear stale ORB tokens when no session exists on boot
2. `src/hooks/useOrbVoiceWidget.ts` — clear ORB auth keys before init when no user is authenticated

## Why previous fixes didn't work
The previous fixes (memory filtering, signOut cleanup, user-scoped conversation keys) were all correct but addressed **downstream** issues. The **upstream** problem is simpler: the ORB widget picks up a stale `vitana.authToken` from localStorage before the app even checks whether a valid session exists. The token was written by Jovana's session and never cleared because no explicit signOut happened.

