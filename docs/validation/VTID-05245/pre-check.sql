-- VTID-05245 pre-check (READ-ONLY). Run before applying
-- 20261101090000_vtid_05245_tenant_email_branding.sql. No writes.
-- Expected: table_absent = true, helper_absent = true, maxina_tenant_ok = true.
SELECT
  to_regclass('public.tenant_email_branding') IS NULL                       AS table_absent,
  to_regprocedure('public.fn_tenant_email_branding(uuid)') IS NULL           AS helper_absent,
  EXISTS (SELECT 1 FROM public.tenants
           WHERE tenant_id = '2e7528b8-472a-4356-88da-0280d4639cce'::uuid
             AND slug = 'maxina')                                            AS maxina_tenant_ok;

-- Expected: 0 rows (no policy of that name left behind on a prior attempt).
SELECT policyname
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'tenant_email_branding';
