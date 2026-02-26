
Goal: stop the mobile OAuth “endless loading until pull-to-refresh” on Maxina while always landing through `/maxina`.

Root cause confirmed
1) `MaxinaPortal` blocks on `authLoading || user || isProcessingOAuth`, so it shows spinner until navigation runs.
2) Redirect logic is one-shot and gated by `supabase.auth.getSession()` inside effect. On some mobile OAuth returns, this first call can be temporarily empty/not-ready even though auth state soon stabilizes.
3) If that one-shot gate misses, no follow-up retry runs, so spinner persists; manual refresh re-runs startup and then navigation succeeds.

Implementation plan
1) Update `src/pages/portals/MaxinaPortal.tsx` redirect effect to be session-driven and retry-safe.
   - Use `session` from `useAuth()` (instead of one-shot `supabase.auth.getSession()` gate).
   - Add `hasRedirectedRef` guard to prevent duplicate navigations.
   - Trigger redirect when `!authLoading && user && (session || !isProcessingOAuth)` with bounded fallback.
2) Add bounded retry for session readiness.
   - If `user` exists but `session` is still null, poll `supabase.auth.getSession()` for up to ~2–3s (short interval) before continuing.
   - This handles mobile OAuth hydration lag without hanging forever.
3) Keep tenant enforcement + timeout, but move navigation to `finally`.
   - Run `setTenantBySlug('maxina')` and mobile prefetch in parallel.
   - Keep existing 5s safety timeout (`Promise.race`) so setup can never block forever.
   - Always call `navigate(target)` in `finally` (once, guarded by ref), even if setup errors.
4) Preserve “always land on Maxina” behavior.
   - Keep `handleSocialLogin` with:
     - `localStorage.setItem('tenant_slug', 'maxina')`
     - `redirectPath = '/maxina'`
   - Do not change this.

Technical details
- File: `src/pages/portals/MaxinaPortal.tsx`
- Precise refactor points:
  - `const { user, loading: authLoading } = useAuth();` → include `session`.
  - Replace `supabase.auth.getSession().then(...)` wrapper in the main redirect `useEffect`.
  - Add:
    - `const hasRedirectedRef = useRef(false);`
    - optional `waitForSessionReady()` helper (local to component/effect).
  - Keep existing mobile default target:
    - `/comm/events-meetups?tab=upcoming` on mobile, `/home` on desktop.
- Safety behavior:
  - Never infinite spinner due to missed one-shot session check.
  - Never duplicate redirect due to ref guard.
  - Tenant switch still attempted before leaving portal, but cannot trap user.

Validation plan
1) Mobile first-time Google signup on `/maxina` with a brand-new account.
2) Confirm flow: Google chooser → returns to `/maxina#...` → spinner briefly → auto lands `/comm/events-meetups?tab=upcoming`.
3) Confirm app bar brand is `Maxina` on first load (no refresh).
4) Repeat on slower network (throttled) to verify no endless loading.
5) Regression check: desktop OAuth still lands `/home`; email/password signin still works.
