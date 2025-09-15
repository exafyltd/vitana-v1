-- CRITICAL SECURITY FIXES - Phase 1: Data Protection and Role Management

-- 1. ENHANCE MEDICAL DATA SECURITY
-- Add stricter RLS policies for medical data access in profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true OR
  -- Allow healthcare professionals to view patient profiles only if they have active membership
  (EXISTS (
    SELECT 1 FROM public.memberships m1, public.memberships m2 
    WHERE m1.user_id = auth.uid() 
    AND m1.role IN ('professional', 'staff', 'admin')
    AND m1.status = 'active'
    AND m2.user_id = profiles.user_id
    AND m1.tenant_id = m2.tenant_id
  ))
);

-- Add separate policy for medical data fields (more restrictive)
CREATE POLICY "Medical data access restricted" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true OR
  -- Only staff and admins can access medical conditions and medications
  (medical_conditions IS NULL AND medications IS NULL) OR
  (EXISTS (
    SELECT 1 FROM public.memberships m 
    WHERE m.user_id = auth.uid() 
    AND m.role IN ('staff', 'admin')
    AND m.status = 'active'
  ))
);

-- 2. STRENGTHEN ROLE MANAGEMENT
-- Create enhanced role validation function
CREATE OR REPLACE FUNCTION public.validate_role_assignment(p_user_id uuid, p_tenant_id uuid, p_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_exafy_admin boolean;
  current_user_role text;
  target_user_current_role text;
BEGIN
  -- Check if current user is exafy_admin
  is_exafy_admin := COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false);
  
  -- Exafy admins can assign any role
  IF is_exafy_admin THEN
    RETURN true;
  END IF;
  
  -- Get current user's highest role in the tenant
  SELECT m.role::text INTO current_user_role
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = p_tenant_id
    AND m.status = 'active'
  ORDER BY 
    CASE m.role::text 
      WHEN 'admin' THEN 5
      WHEN 'staff' THEN 4 
      WHEN 'professional' THEN 3
      WHEN 'patient' THEN 2
      WHEN 'community' THEN 1
      ELSE 0
    END DESC
  LIMIT 1;
  
  -- Get target user's current role
  SELECT m.role::text INTO target_user_current_role
  FROM public.memberships m
  WHERE m.user_id = p_user_id
    AND m.tenant_id = p_tenant_id
    AND m.status = 'active'
  LIMIT 1;
  
  -- Prevent privilege escalation: users can only assign roles lower than their own
  -- Admin can assign any role except admin (unless they're exafy_admin)
  -- Staff can assign patient/community roles only
  -- Others cannot assign roles
  
  CASE current_user_role
    WHEN 'admin' THEN
      -- Admins can assign any role except admin (unless target is already admin)
      RETURN p_role IN ('staff', 'professional', 'patient', 'community') OR 
             (p_role = 'admin' AND target_user_current_role = 'admin');
    WHEN 'staff' THEN
      -- Staff can only assign patient and community roles
      RETURN p_role IN ('patient', 'community');
    ELSE
      -- Others cannot assign roles
      RETURN false;
  END CASE;
END;
$$;

-- Update set_role_preference function with enhanced security
CREATE OR REPLACE FUNCTION public.set_role_preference(p_tenant_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  is_exafy_admin boolean;
  is_valid_assignment boolean;
BEGIN
  -- Check if user is exafy_admin using proper metadata
  is_exafy_admin := COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false);
  
  -- Validate the role assignment
  SELECT public.validate_role_assignment(auth.uid(), p_tenant_id, p_role) INTO is_valid_assignment;
  
  -- For non-admin users, verify the role is granted in memberships AND validate assignment
  IF NOT is_exafy_admin THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.memberships m
      WHERE m.user_id = auth.uid()
        AND m.tenant_id = p_tenant_id
        AND m.role::text = p_role
        AND m.status = 'active'
    ) OR NOT is_valid_assignment THEN
      RAISE EXCEPTION 'Role not granted for this tenant or invalid role assignment';
    END IF;
  END IF;

  -- Prevent users from switching to admin role unless they're exafy_admin
  IF p_role = 'admin' AND NOT is_exafy_admin THEN
    RAISE EXCEPTION 'Admin role can only be assigned by super administrators';
  END IF;

  -- Insert or update role preference
  INSERT INTO public.role_preferences (user_id, tenant_id, role)
  VALUES (auth.uid(), p_tenant_id, p_role)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET role = EXCLUDED.role, updated_at = now();
  
  -- Enhanced audit logging for all role switches
  INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
  VALUES (
    auth.uid(),
    p_tenant_id,
    CASE WHEN is_exafy_admin THEN 'admin_role_switch' ELSE 'user_role_switch' END,
    jsonb_build_object(
      'new_role', p_role, 
      'timestamp', now(),
      'is_exafy_admin', is_exafy_admin,
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    )
  );
END;
$function$;

-- 3. SECURE ADMIN FUNCTIONS
-- Enhanced bootstrap function with better validation and logging
CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(p_user_id uuid, p_user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_admin_id uuid;
  user_exists boolean;
BEGIN
  -- Get the current user performing the bootstrap
  current_admin_id := auth.uid();
  
  -- Validate that the current user is an exafy_admin
  IF NOT COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Only exafy_admin can bootstrap admin users';
  END IF;
  
  -- Check if target user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Target user does not exist: %', p_user_email;
  END IF;
  
  -- Prevent bootstrapping if user is already an admin
  IF COALESCE((
    SELECT (raw_app_meta_data ->> 'exafy_admin')::boolean 
    FROM auth.users 
    WHERE id = p_user_id
  ), false) THEN
    -- Log attempted duplicate bootstrap
    INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
    VALUES (
      current_admin_id,
      (SELECT id FROM public.tenants WHERE name = 'Maxina' LIMIT 1),
      'admin_bootstrap_duplicate_attempt',
      jsonb_build_object(
        'target_user_id', p_user_id,
        'target_email', p_user_email,
        'timestamp', now(),
        'reason', 'User already has admin privileges'
      )
    );
    
    RAISE EXCEPTION 'User % is already an admin', p_user_email;
  END IF;
  
  -- Log bootstrap attempt before execution
  INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
  VALUES (
    current_admin_id,
    (SELECT id FROM public.tenants WHERE name = 'Maxina' LIMIT 1),
    'admin_bootstrap_attempt',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', p_user_email,
      'bootstrap_initiated_by', current_admin_id,
      'timestamp', now()
    )
  );
  
  -- Update user's raw_app_meta_data to make them exafy_admin
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('exafy_admin', true)
  WHERE id = p_user_id;
  
  -- Create memberships for all workspaces as admin (only if they don't exist)
  INSERT INTO public.memberships (user_id, tenant_id, role, status)
  SELECT p_user_id, t.id, 'admin'::tenant_role, 'active'
  FROM public.tenants t
  WHERE t.name IN ('Maxina', 'Alkalma', 'Earthlings')
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = now();
    
  -- Set the first tenant as active
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('active_tenant_id', (
      SELECT id FROM public.tenants WHERE name = 'Maxina' LIMIT 1
    ))
  WHERE id = p_user_id;
  
  -- Log successful bootstrap completion
  INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
  VALUES (
    current_admin_id,
    (SELECT id FROM public.tenants WHERE name = 'Maxina' LIMIT 1),
    'admin_bootstrap_success',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'target_email', p_user_email,
      'bootstrap_completed_by', current_admin_id,
      'timestamp', now(),
      'tenants_assigned', ARRAY['Maxina', 'Alkalma', 'Earthlings']
    )
  );
END;
$function$;

-- 4. ENHANCED LAB TEST SECURITY
-- Stricter RLS for lab test orders and results
DROP POLICY IF EXISTS "Users can view their own orders" ON public.lab_test_orders;
CREATE POLICY "Users can view their own orders" 
ON public.lab_test_orders 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true OR
  -- Allow healthcare staff to view orders within their tenant
  (EXISTS (
    SELECT 1 FROM public.memberships m1, public.profiles p
    WHERE m1.user_id = auth.uid() 
    AND m1.role IN ('professional', 'staff', 'admin')
    AND m1.status = 'active'
    AND p.user_id = lab_test_orders.user_id
    AND p.tenant_id = m1.tenant_id
  ))
);

DROP POLICY IF EXISTS "Users can view their own results" ON public.lab_test_results;
CREATE POLICY "Users can view their own results" 
ON public.lab_test_results 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true OR
  -- Allow healthcare staff to view results within their tenant
  (EXISTS (
    SELECT 1 FROM public.memberships m1, public.profiles p
    WHERE m1.user_id = auth.uid() 
    AND m1.role IN ('professional', 'staff', 'admin')
    AND m1.status = 'active'
    AND p.user_id = lab_test_results.user_id
    AND p.tenant_id = m1.tenant_id
  ))
);

-- 5. AUDIT ENHANCED PERMISSIONS
-- Add comprehensive audit logging for sensitive operations
CREATE POLICY "Enhanced audit access for medical data" 
ON public.audit_events 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  ((((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true) OR
  -- Allow healthcare staff to view audit logs for their tenant's operations
  (EXISTS (
    SELECT 1 FROM public.memberships m 
    WHERE m.user_id = auth.uid() 
    AND m.role IN ('staff', 'admin')
    AND m.status = 'active'
    AND m.tenant_id = audit_events.tenant_id
  ))
);

-- Create trigger to log medical data access
CREATE OR REPLACE FUNCTION public.log_medical_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Log access to medical fields
  IF (OLD.medical_conditions IS DISTINCT FROM NEW.medical_conditions) OR 
     (OLD.medications IS DISTINCT FROM NEW.medications) THEN
    INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
    VALUES (
      auth.uid(),
      NEW.tenant_id,
      'medical_data_access',
      jsonb_build_object(
        'profile_user_id', NEW.user_id,
        'fields_accessed', ARRAY['medical_conditions', 'medications'],
        'timestamp', now(),
        'action', TG_OP
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for medical data access logging
DROP TRIGGER IF EXISTS log_medical_access ON public.profiles;
CREATE TRIGGER log_medical_access
  AFTER UPDATE OF medical_conditions, medications ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_medical_data_access();