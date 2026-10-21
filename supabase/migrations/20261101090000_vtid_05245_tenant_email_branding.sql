-- =============================================================================
-- VTID-05245 (mt-frontend-brand / email-brand-db, ED1) — tenant-keyed email
-- branding: a new table + a read helper, seeded with Maxina's CURRENT values.
-- -----------------------------------------------------------------------------
-- Plan: exafyltd/vitana-platform .kiro/specs/mt-frontend-brand/ (plan.md, tasks.md
-- ED1-ED2, design.md "Rules every successor follows").
--
-- Expand only. Nothing reads this table or the helper yet: the consumer is the
-- follow-on lane email-brand-code (supabase/functions/_shared/tenant-brand.ts,
-- EC1), which ships after this migration is applied. So no email and no OG card
-- changes when this runs.
--
--   * public.tenant_email_branding — one row per tenant, keyed by tenant_id
--     (FK public.tenants(tenant_id), the convention of every tenant table in this
--     project). All brand columns are nullable: a tenant row may override only
--     some fields; the helper fills the rest from Maxina's row.
--   * public.fn_tenant_email_branding(p_tenant_id uuid) — returns exactly one row
--     (sender_name, sender_email, logo_url, brand_name, site_name, support_email)
--     for the tenant, each field falling back to Maxina's value; an unknown or
--     NULL tenant id gets Maxina's row. site_name is the OG/share-card site name
--     EC1 also resolves ("resolve sender/logo/brand/site-name").
--   * RLS on: service_role full access (edge functions run as service_role);
--     an authenticated user can SELECT only the row of its own active tenant
--     (same predicate as tenant_settings "tenant_read"). anon: nothing. The
--     helper is SECURITY INVOKER, EXECUTE for service_role only — it never
--     widens what a caller can read. No member write grants anywhere
--     (VTID-05147 AC-5 unchanged).
--
-- Seeded Maxina values — each is the literal the live email/OG path uses today
-- (worktree origin/main 32a82e6b6). Where functions disagree, the variants are
-- listed so email-brand-code keeps them byte-identical (docs/validation/VTID-05245/scope.json):
--   sender_name   'Maxina by VITANA'
--                   supabase/functions/send-welcome-discount/index.ts:187
--                   (variants: voucher-send-email/index.ts:359 "Vitana Gifts";
--                    send-appointment-email/index.ts:262 and
--                    send-appointment-reminder/index.ts:213 "Healthcare Appointments";
--                    send-test-user-confirmation/index.ts:114 "MAXINA")
--   sender_email  'noreply@vitanaland.com'
--                   supabase/functions/send-welcome-discount/index.ts:187,
--                   voucher-send-email/index.ts:359, send-test-user-confirmation/index.ts:114
--                   (variant: appointments@resend.dev in send-appointment-email:262 /
--                    send-appointment-reminder:213)
--   logo_url      'https://vitanaland.com/images/maxina-logo.png'
--                   supabase/functions/send-welcome-discount/index.ts:113
--                   (variant host: voucher-send-email/index.ts:265
--                    https://vitana-v1.lovable.app/images/maxina-logo.png)
--   brand_name    'MAXINA'
--                   supabase/functions/send-welcome-discount/index.ts:113 (logo alt),
--                   voucher-send-email/index.ts:265 (logo alt), :344 ("sent via MAXINA")
--   site_name     'VITANA'
--                   supabase/functions/og-share/index.ts:96 (og:site_name), :91 ("| VITANA"),
--                   og-campaign/index.ts:89,148
--                   (variant 'MAXINA': og-event/index.ts:85,123; og-short/index.ts:80,118)
--   support_email 'hello@vitana.app'
--                   supabase/functions/voucher-send-email/index.ts:347,
--                   process-campaign-queue/index.ts:217
--
-- Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING). On a database without the
-- Maxina tenant (local replay) the seed is skipped with a NOTICE.
-- Rollback: docs/validation/VTID-05245/rollback.sql
-- =============================================================================
BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- ── 1. table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_email_branding (
  tenant_id     uuid PRIMARY KEY REFERENCES public.tenants(tenant_id) ON DELETE CASCADE,
  sender_name   text,
  sender_email  text,
  logo_url      text,
  brand_name    text,
  site_name     text,
  support_email text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_email_branding IS
  'VTID-05245: per-tenant email + OG branding (sender, logo, brand/site name, support email). NULL field = Maxina value. Read through fn_tenant_email_branding(); consumer: supabase/functions/_shared/tenant-brand.ts (email-brand-code).';

ALTER TABLE public.tenant_email_branding ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tenant_email_branding FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.tenant_email_branding TO service_role;
GRANT SELECT ON TABLE public.tenant_email_branding TO authenticated;

DROP POLICY IF EXISTS "service_role_all" ON public.tenant_email_branding;
CREATE POLICY "service_role_all" ON public.tenant_email_branding
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_read" ON public.tenant_email_branding;
CREATE POLICY "tenant_read" ON public.tenant_email_branding
  FOR SELECT TO authenticated
  USING (
    tenant_id = (
      SELECT (u.raw_app_meta_data ->> 'active_tenant_id')::uuid
        FROM auth.users u WHERE u.id = auth.uid()
    )
  );

-- ── 2. read helper (Maxina fallback per field) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_tenant_email_branding(p_tenant_id uuid)
RETURNS TABLE (
  sender_name   text,
  sender_email  text,
  logo_url      text,
  brand_name    text,
  site_name     text,
  support_email text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $fn$
  SELECT coalesce(t.sender_name,   m.sender_name),
         coalesce(t.sender_email,  m.sender_email),
         coalesce(t.logo_url,      m.logo_url),
         coalesce(t.brand_name,    m.brand_name),
         coalesce(t.site_name,     m.site_name),
         coalesce(t.support_email, m.support_email)
    FROM public.tenant_email_branding m
    LEFT JOIN public.tenant_email_branding t
           ON t.tenant_id = p_tenant_id
   WHERE m.tenant_id = '2e7528b8-472a-4356-88da-0280d4639cce'::uuid;  -- maxina
$fn$;

COMMENT ON FUNCTION public.fn_tenant_email_branding(uuid) IS
  'VTID-05245: email/OG branding for a tenant; every NULL or missing field falls back to Maxina (tenant 2e7528b8-472a-4356-88da-0280d4639cce). Unknown/NULL tenant -> Maxina row.';

REVOKE ALL ON FUNCTION public.fn_tenant_email_branding(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_tenant_email_branding(uuid) TO service_role;

-- ── 3. seed Maxina (one row) + self-check ───────────────────────────────────
DO $seed$
DECLARE
  v_maxina constant uuid := '2e7528b8-472a-4356-88da-0280d4639cce';
BEGIN
  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'maxina' AND tenant_id <> v_maxina) THEN
    RAISE EXCEPTION 'VTID-05245: maxina tenant_id differs from the live id — seed refused';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE tenant_id = v_maxina) THEN
    RAISE NOTICE 'VTID-05245: maxina tenant absent (local replay) — seed skipped';
    RETURN;
  END IF;

  INSERT INTO public.tenant_email_branding
    (tenant_id, sender_name, sender_email, logo_url, brand_name, site_name, support_email)
  VALUES
    (v_maxina,
     'Maxina by VITANA',
     'noreply@vitanaland.com',
     'https://vitanaland.com/images/maxina-logo.png',
     'MAXINA',
     'VITANA',
     'hello@vitana.app')
  ON CONFLICT (tenant_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.fn_tenant_email_branding(NULL) b
     WHERE b.sender_name   = 'Maxina by VITANA'
       AND b.sender_email  = 'noreply@vitanaland.com'
       AND b.logo_url      = 'https://vitanaland.com/images/maxina-logo.png'
       AND b.brand_name    = 'MAXINA'
       AND b.site_name     = 'VITANA'
       AND b.support_email = 'hello@vitana.app'
  ) THEN
    RAISE EXCEPTION 'VTID-05245 self-check: fn_tenant_email_branding(NULL) does not return the Maxina row';
  END IF;
END
$seed$;

-- Self-check: RLS on, no anon/member write grant.
DO $chk$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tenant_email_branding'::regclass) THEN
    RAISE EXCEPTION 'VTID-05245 self-check: RLS is not enabled on tenant_email_branding';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND table_name = 'tenant_email_branding'
       AND grantee IN ('anon', 'authenticated', 'PUBLIC')
       AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) THEN
    RAISE EXCEPTION 'VTID-05245 self-check: anon/authenticated hold a write grant on tenant_email_branding';
  END IF;
END
$chk$;

COMMIT;
