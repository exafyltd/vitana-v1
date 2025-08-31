-- Fix the bootstrap_admin_user function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(user_id uuid, user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update user's raw_app_meta_data to make them exafy_admin
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('exafy_admin', true)
  WHERE id = bootstrap_admin_user.user_id;
  
  -- Create memberships for all three workspaces as admin
  INSERT INTO public.memberships (user_id, tenant_id, role, status)
  SELECT bootstrap_admin_user.user_id, t.id, 'admin'::tenant_role, 'active'
  FROM public.tenants t
  WHERE t.name IN ('Maxina', 'Alkalma', 'Earthlings')
  ON CONFLICT (public.memberships.user_id, public.memberships.tenant_id) DO UPDATE SET
    role = 'admin'::tenant_role,
    status = 'active';
    
  -- Set the first tenant as active
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('active_tenant_id', (
      SELECT id FROM public.tenants WHERE name = 'Maxina' LIMIT 1
    ))
  WHERE id = bootstrap_admin_user.user_id;
  
END;
$function$