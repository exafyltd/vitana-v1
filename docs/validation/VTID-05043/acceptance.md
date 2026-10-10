# VTID-05043 - switch_to_tenant_by_slug joins open-signup tenants only: vitana-v1 mirror guard (Track S / S3)

Owner approval 2026-10-10 (Gate 1: "Yes approved"). Sparring: `plan-sparring.md` (converged, 3 rounds).

This PR adds a build guard only (no runtime change). The database change ships in exafyltd/vitana-platform
(`supabase/migrations/20261010170200_vtid_05043_s3_switch_tenant_open_signup_only.sql`, VTID-05043 PR2) and is
verified read-only there after RUN-MIGRATION (`docs/validation/VTID-05043/post-apply-checks.sql`).
The callers (`useTenant.tsx` setTenantBySlug, `AlkalmaPortal.tsx`) are unchanged: after the platform migration
an existing member's call succeeds again, and a refusal (42501 TENANT_NOT_JOINABLE) reaches the existing
error/fallback path.

## Acceptance criteria

AC-1: The build fails if any migration in this repo newer than 20250909092110 (the last definition shipped here) creates or replaces `switch_to_tenant_by_slug` without an `open_signup` check in the function body; comments do not count.
  TEST: src/integrations/supabase/switch-tenant-open-signup.vtid-05043.test.ts

AC-2: The guard is proven to bite: a rewrite without the check is flagged, one with it is accepted, a call site is not mistaken for a definition; a temporary migration re-creating the 2025 body (with tenant_id fixed, no open_signup) failed the suite.
  TEST: src/integrations/supabase/switch-tenant-open-signup.vtid-05043.test.ts ("the guard itself")
