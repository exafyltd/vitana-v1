-- Create an admin setup function
CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(
  user_id UUID,
  user_email TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update user's app_metadata to make them exafy_admin
  UPDATE auth.users 
  SET app_metadata = COALESCE(app_metadata, '{}'::jsonb) || jsonb_build_object('role', 'exafy_admin')
  WHERE id = user_id;
  
  -- Create memberships for all three workspaces as admin
  INSERT INTO public.memberships (user_id, tenant_id, role, status)
  SELECT user_id, t.id, 'admin'::tenant_role, 'active'
  FROM public.tenants t
  WHERE t.name IN ('Maxina', 'Alkalma', 'Earthlings')
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role = 'admin'::tenant_role,
    status = 'active';
    
  -- Set the first tenant as active
  UPDATE auth.users 
  SET app_metadata = COALESCE(app_metadata, '{}'::jsonb) || 
    jsonb_build_object('active_tenant_id', (
      SELECT id FROM public.tenants WHERE name = 'Maxina' LIMIT 1
    ))
  WHERE id = user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;