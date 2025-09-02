-- Manually elevate j.tadic@exafy.io to super admin
-- First, find and update the user's metadata
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('exafy_admin', true)
WHERE email = 'j.tadic@exafy.io';

-- Set active tenant to Maxina for j.tadic@exafy.io
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('active_tenant_id', (
    SELECT id FROM public.tenants WHERE slug = 'maxina' LIMIT 1
  ))
WHERE email = 'j.tadic@exafy.io';

-- Create admin memberships for all three tenants for j.tadic@exafy.io
INSERT INTO public.memberships (user_id, tenant_id, role, status)
SELECT u.id, t.id, 'admin'::tenant_role, 'active'
FROM auth.users u, public.tenants t
WHERE u.email = 'j.tadic@exafy.io'
  AND t.slug IN ('maxina', 'alkalma', 'earthlings')
ON CONFLICT (user_id, tenant_id) DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- Log audit event for manual elevation
INSERT INTO public.audit_events (user_id, event_type, event_data)
SELECT u.id, 'admin_elevated', jsonb_build_object(
  'email', 'j.tadic@exafy.io',
  'elevated_by', 'manual_fix',
  'reason', 'bootstrap_function_issue'
)
FROM auth.users u
WHERE u.email = 'j.tadic@exafy.io';