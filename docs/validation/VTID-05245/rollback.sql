-- VTID-05245 rollback: reverses supabase/migrations/20261101090000_vtid_05245_tenant_email_branding.sql
-- completely. Run only after the email-brand-code consumer (supabase/functions/_shared/tenant-brand.ts)
-- is reverted or no longer calls fn_tenant_email_branding — otherwise it falls back to its
-- compiled Maxina values (EC1 contract). Order: helper -> policies -> table.
BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DROP FUNCTION IF EXISTS public.fn_tenant_email_branding(uuid);

DROP POLICY IF EXISTS "tenant_read" ON public.tenant_email_branding;
DROP POLICY IF EXISTS "service_role_all" ON public.tenant_email_branding;

DROP TABLE IF EXISTS public.tenant_email_branding;

DO $chk$
BEGIN
  IF to_regclass('public.tenant_email_branding') IS NOT NULL THEN
    RAISE EXCEPTION 'VTID-05245 rollback: tenant_email_branding still exists';
  END IF;
  IF to_regprocedure('public.fn_tenant_email_branding(uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'VTID-05245 rollback: fn_tenant_email_branding(uuid) still exists';
  END IF;
END
$chk$;

COMMIT;
