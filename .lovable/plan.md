

# Report: Why the ORB Widget Says "Hello Jovana" on the Landing Page

## The Race Condition

The problem is a **timing race** that none of the previous fixes addressed:

```text
Timeline on page load:
──────────────────────────────────────────────────────
1. Browser parses index.html
2. <script src="orb-widget.js" defer> starts downloading
3. Supabase client created (client.ts) — reads sb-*-auth-token from localStorage
4. React mounts → AuthProvider runs
5. AuthProvider calls getSession() — this is ASYNC
6. orb-widget.js finishes loading → window.VitanaOrb becomes available
7. useOrbVoiceWidget polling finds VitanaOrb → calls tryInit()
8. tryInit() checks `user` — but user is STILL NULL because getSession() hasn't resolved yet
9. tryInit() clears vitana.authToken ✓ ... but the widget doesn't use only vitana.authToken
10. orb.init() runs → widget reads auth from SUPABASE'S OWN localStorage key
11. getSession() finally resolves → finds a VALID session (Jovana's or whoever's)

The widget already initialized with the old token.
```

## The Real Auth Source the Widget Uses

The external `orb-widget.js` auto-detects authentication from **multiple sources**:
1. `vitana.authToken` in localStorage (the key we've been clearing)
2. **The Supabase session token itself** — stored at `sb-inmkhvwdcuyhnxkgfvsb-auth-token` in localStorage by the Supabase client

The Supabase key persists across page loads by design (that's how `persistSession: true` works). When the previous user (Jovana) signed in, Supabase stored her session. Even if Jovana didn't explicitly sign out:
- The Supabase session token **remains valid** in localStorage
- The ORB widget reads it directly or via the gateway's token validation
- Our code only clears `vitana.authToken` — it never touches the Supabase session key

## Why "Based on Previous Conversations" Appears on Landing Page

The ORB widget establishes an SSE connection to the gateway (`/api/v1/orb/live/stream`). The console logs confirm:
```
[VTOrb] Starting Gemini Live session...
[VTOrb] SSE connected
```

This happens **even on the landing page**. The gateway:
1. Receives the auth token (from `vitana.authToken` or Supabase's own key)
2. Validates it and extracts `user_id`
3. Bootstraps the user's full context (memories, diary, profile) server-side
4. The AI greets with that context — "Hello Jovana, based on your previous conversations..."

The context is loaded **server-side by the gateway**, not by our app code. Our `buildOrbContext.ts` filtering is irrelevant because the gateway does its own context loading.

## Why Previous Fixes Failed

| Fix | Why it didn't work |
|---|---|
| Memory filtering in `get-proactive-context` | Gateway loads context independently, doesn't use this function for ORB |
| Clearing `vitana.authToken` on boot | Widget may also read the Supabase session key directly |
| `useOrbVoiceWidget` user check | `user` is null during init due to async `getSession()` — race condition |
| `clearOrbSessionState()` on no session | Runs after widget already initialized |
| User-scoped `orb_conversation_id` | Doesn't affect which user the gateway thinks is connected |

## The Fix (2 changes needed)

### 1. Delay ORB widget initialization until auth state is resolved
**File: `src/hooks/useOrbVoiceWidget.ts`**

The `useEffect` that polls for `VitanaOrb` runs with `[]` dependency (mount only) and uses a stale closure over `user` which is always `null` at mount. The fix:

- Add `user` and `loading` from `useAuth()` to the dependency/guard
- Do NOT call `orb.init()` until `loading === false` (auth resolved)
- If `loading === false && user === null`: clear ALL auth keys (including `sb-inmkhvwdcuyhnxkgfvsb-auth-token`) before calling `orb.init()`
- If `loading === false && user !== null`: ensure `vitana.authToken` has the current token, then call `orb.init()`

### 2. Clear the Supabase session key on explicit sign-out
**File: `src/context/AuthProvider.tsx`**

Add the Supabase-managed auth key to `clearOrbSessionState()`:
```
localStorage.removeItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token');
```

Wait — this would break Supabase's own session management. Instead, the correct approach is:
- On sign-out: `supabase.auth.signOut()` already clears this key
- On landing page (no session): don't clear the Supabase key, but **don't pass it to the widget either**

The real fix is purely in the widget init timing: **wait for auth to resolve, then init the widget with the correct (or no) token**.

### 3. Pass explicit auth config to `orb.init()`
**File: `src/hooks/useOrbVoiceWidget.ts`**

Instead of letting the widget auto-detect auth from localStorage, pass the token explicitly:
```typescript
// When user is authenticated:
orb.init({ showFab: true, authToken: session.access_token });

// When anonymous:
orb.init({ showFab: true, authToken: null });
```

This removes the widget's ability to pick up stale tokens from any localStorage key.

## Files to change
1. `src/hooks/useOrbVoiceWidget.ts` — wait for auth resolution before init; pass explicit auth config
2. `src/context/AuthProvider.tsx` — minor: also clear Supabase auth key pattern in `clearOrbSessionState()` as defense-in-depth

## Technical note
The external `orb-widget.js` is hosted on the gateway and we cannot modify it. If it ignores the `authToken: null` parameter and still reads localStorage, we need to also clear `sb-inmkhvwdcuyhnxkgfvsb-auth-token` temporarily before calling `orb.init()` and restore it after (to not break Supabase session management). This is a workaround until the widget respects explicit auth params.

