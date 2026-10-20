-- VTID-05245 post-check (READ-ONLY). Run after applying
-- 20261101090000_vtid_05245_tenant_email_branding.sql. No writes.

-- 1. Expected: exactly 1 row —
--    Maxina by VITANA | noreply@vitanaland.com | https://vitanaland.com/images/maxina-logo.png
--    | MAXINA | VITANA | hello@vitana.app
SELECT * FROM public.fn_tenant_email_branding('2e7528b8-472a-4356-88da-0280d4639cce'::uuid);

-- 2. Fallback: an unknown tenant id and NULL return the same Maxina row (expected: 2 rows, all true).
SELECT b.sender_name = 'Maxina by VITANA'
   AND b.sender_email = 'noreply@vitanaland.com'
   AND b.logo_url = 'https://vitanaland.com/images/maxina-logo.png'
   AND b.brand_name = 'MAXINA'
   AND b.site_name = 'VITANA'
   AND b.support_email = 'hello@vitana.app' AS maxina_fallback_ok
  FROM (SELECT * FROM public.fn_tenant_email_branding('00000000-0000-0000-0000-000000000000'::uuid)
        UNION ALL
        SELECT * FROM public.fn_tenant_email_branding(NULL)) b;

-- 3. Expected: rls_on = true, rows = 1, helper_exec_service_role = true,
--    helper_exec_authenticated = false, helper_exec_anon = false.
SELECT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tenant_email_branding'::regclass) AS rls_on,
       (SELECT count(*) FROM public.tenant_email_branding)                                         AS rows,
       has_function_privilege('service_role',  'public.fn_tenant_email_branding(uuid)', 'EXECUTE') AS helper_exec_service_role,
       has_function_privilege('authenticated', 'public.fn_tenant_email_branding(uuid)', 'EXECUTE') AS helper_exec_authenticated,
       has_function_privilege('anon',          'public.fn_tenant_email_branding(uuid)', 'EXECUTE') AS helper_exec_anon;

-- 4. Expected: 2 rows — service_role_all (ALL, service_role), tenant_read (SELECT, authenticated).
SELECT policyname, cmd, roles
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'tenant_email_branding'
 ORDER BY policyname;

-- 5. Expected: 0 rows (no anon/member write grant).
SELECT grantee, privilege_type
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND table_name = 'tenant_email_branding'
   AND grantee IN ('anon', 'authenticated', 'PUBLIC')
   AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
