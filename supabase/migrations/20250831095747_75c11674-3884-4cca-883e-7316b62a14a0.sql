-- Update set_role_preference function to allow exafy_admin users to bypass membership verification
CREATE OR REPLACE FUNCTION public.set_role_preference(p_tenant_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  is_exafy_admin boolean;
BEGIN
  -- Check if user is exafy_admin
  is_exafy_admin := COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false);
  
  -- For non-admin users, verify the role is granted in memberships
  IF NOT is_exafy_admin THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = p_tenant_id
        AND m.role::text = p_role
        AND m.status = 'active'
    ) THEN
      RAISE EXCEPTION 'Role not granted for this tenant';
    END IF;
  END IF;

  -- Insert or update role preference
  INSERT INTO public.role_preferences (user_id, tenant_id, role)
  VALUES (auth.uid(), p_tenant_id, p_role)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET role = EXCLUDED.role, updated_at = now();
  
  -- Log admin role switches for audit purposes
  IF is_exafy_admin THEN
    INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
    VALUES (
      auth.uid(),
      p_tenant_id,
      'admin_role_switch',
      jsonb_build_object('new_role', p_role, 'timestamp', now())
    );
  END IF;
END;
$function$