
Goal: stop cross-account leakage so Alex never receives Jovana’s identity or memory again.

What I found
1. The previous memory-filter fix is present in:
   - `supabase/functions/get-proactive-context/index.ts`
   - `supabase/functions/ai-chat/index.ts`
   - `src/lib/buildOrbContext.ts`
2. The database does not show active “Jovana” memories for Alex’s user ID.
3. Alex currently has no cached proactive context row, so this is likely not coming from `proactive_context_cache`.
4. The stronger remaining leak is the ORB/session layer:
   - `src/hooks/useOrbVoiceWidget.ts` initializes the external widget globally with `orb.init({ showFab: true })`
   - the widget auto-reads auth from browser storage
   - the app does not explicitly sync the current logged-in Supabase token into widget storage on sign-in
   - the app also does not clear widget-specific auth/context keys on sign-out
5. There is also a second leakage risk in the legacy React ORB path:
   - `src/hooks/useOrbVoiceClient.ts` stores `orb_conversation_id` in plain `localStorage`
   - that key is not user-scoped and not cleared on logout
   - if reused across accounts, it can carry prior assistant context/history

Most likely root cause
The currently logged-in UI session and the ORB voice session are drifting apart. The widget is likely still booting with a stale token and/or stale ORB conversation from Jovana’s previous browser session, so the gateway thinks the active user is Jovana even while the app UI shows Alex.

Implementation plan
1. Add explicit ORB auth/session sync in the auth layer
   - Update `src/context/AuthProvider.tsx`
   - On sign-in / token refresh:
     - write the current access token to a dedicated ORB key such as `vitana.authToken`
     - write the current authenticated user id to a key like `vitana.userId`
   - On sign-out:
     - remove `vitana.authToken`
     - remove `vitana.userId`
     - remove any ORB session/conversation keys
   - This makes the widget follow the real authenticated session instead of stale browser state.

2. Clear cross-user ORB state on auth changes
   - In `src/context/AuthProvider.tsx`, detect when the authenticated user id changes
   - If user changes from one account to another:
     - clear `orb_conversation_id`
     - clear any widget session ids / cached greeting ids if present
     - optionally trigger widget destroy/re-init path indirectly through a small reset signal
   - This prevents account A’s conversation/session from being reused by account B.

3. User-scope the legacy ORB conversation cache
   - Update `src/hooks/useOrbVoiceClient.ts`
   - Replace plain `orb_conversation_id` with a user-scoped key, e.g. `orb_conversation_id:${user.id}`
   - When reading stored conversation ids, only use the current user’s key
   - This blocks conversation history bleed between accounts on shared browsers/devices.

4. Add a defensive widget reset hook
   - Update `src/hooks/useOrbVoiceWidget.ts`
   - Re-initialize or refresh the widget when auth identity changes, rather than only once on mount
   - Keep the zero-config init, but make the hook respond to current auth state so the widget cannot stay attached to an old identity after account switching.

5. Audit and clear any other ORB-related localStorage keys
   - Search for keys used by voice/gateway integration
   - Explicitly clear them on logout and on user-switch if they can carry identity/session context
   - Keep tenant keys if needed, but clear user-bound voice keys.

6. Add server-side identity hardening where feasible
   - Review any ORB/gateway-backed request path still using client-provided context/session ids
   - Ensure user context is always derived from the validated token, not from reusable client storage
   - If there is any app-controlled request that passes prior conversation/session ids, only allow ids that belong to the current user.

7. Verify the full leak path after implementation
   - Test this exact sequence:
     - sign in as Jovana
     - use ORB
     - sign out
     - sign in as Alex
     - use ORB and greeting again
   - Confirm:
     - Alex is called Alex
     - no Jovana memories appear
     - a fresh ORB session is created for Alex
   - Also test on mobile-sized viewport since the user is currently on mobile.

Files I expect to change
- `src/context/AuthProvider.tsx`
- `src/hooks/useOrbVoiceWidget.ts`
- `src/hooks/useOrbVoiceClient.ts`

Technical notes
- The previous memory filtering was necessary, but it did not address stale auth/session state inside the external ORB widget.
- Because the widget is loaded globally from `index.html` and initialized once, auth synchronization must be explicit.
- The unscoped `orb_conversation_id` is a concrete bug even if it is not the only cause.
