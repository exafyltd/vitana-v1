
Goal: eliminate mobile OAuth spinner lock and guarantee Maxina tenant consistency after Google sign-in.

Implementation steps:
1) Refactor `src/pages/portals/MaxinaPortal.tsx` redirect flow to be fail-safe and non-blocking.
- Remove the current session-poll loop that awaits `supabase.auth.getSession()` inside the redirect effect.
- Add a redirect state machine with `redirectStartedRef` + hard deadline timer (e.g. 6s) so navigation always completes once auth is settled.
- Keep `/maxina` as OAuth return path, but only show the loading spinner while redirect is actively running (not indefinitely on any `user` truthy state).
- Keep tenant switch + prefetch in parallel, but never let either block navigation beyond timeout.

2) Fix tenant source-of-truth race in `src/hooks/useTenant.tsx`.
- Remove “fallback to first tenant” (`select tenant_id limit 1`) for authenticated users with missing `active_tenant_id`.
- Replace with deterministic fallback order: URL tenant slug → `localStorage.tenant_slug` → `user.user_metadata.tenant_slug` (if present) → no forced tenant.
- Add stale-async protection so old fallback requests cannot overwrite a newer `setTenantBySlug('maxina')` result.

3) Prevent app-bar mislabeling during hydration in `src/components/mobile/TopAppBar.tsx`.
- Use deterministic tenant display precedence on community/mobile routes: URL/localStorage instant slug first, then context tenant.
- Keep context tenant for styling once it matches settled tenant, but avoid displaying Earthlinks during Maxina OAuth transition.

4) Tighten detector behavior in `src/components/TenantDetector.tsx`.
- Ensure effect re-evaluates when auth/session becomes available (not only pathname/tenant slug), so `/maxina` reliably triggers `setTenantBySlug('maxina')` right after OAuth return.

5) Add targeted debug logging (temporary, scoped).
- In MaxinaPortal and useTenant: log redirect start/finish, tenant switch attempts/results, fallback source chosen, and timeout path.
- Use these logs to confirm there is no dead path where spinner remains without navigate.

Technical details:
- Files to update:
  - `src/pages/portals/MaxinaPortal.tsx`
  - `src/hooks/useTenant.tsx`
  - `src/components/mobile/TopAppBar.tsx`
  - `src/components/TenantDetector.tsx`
- Root causes being fixed:
  - Redirect effect has an async dead path before navigation is guaranteed.
  - Tenant provider can assign arbitrary first tenant and race-overwrite Maxina.
  - Mobile app bar trusts async tenant context before deterministic slug during post-OAuth hydration.
- Validation checklist:
  - Mobile first-time Google sign-in from `/maxina` lands without pull-to-refresh.
  - App bar shows Maxina immediately and remains Maxina on `/comm/events-meetups?tab=upcoming`.
  - No Earthlinks flash during transition.
  - Desktop Maxina OAuth still lands correctly.
