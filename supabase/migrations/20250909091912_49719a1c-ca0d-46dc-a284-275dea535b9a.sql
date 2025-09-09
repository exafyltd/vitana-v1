-- Fix the switch_to_tenant_by_slug function search_path issue
CREATE OR REPLACE FUNCTION public.switch_to_tenant_by_slug(p_tenant_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_record RECORD;
  existing_membership RECORD;
BEGIN
  -- Find the tenant by slug
  SELECT * INTO tenant_record FROM public.tenants WHERE slug = p_tenant_slug;
  
  IF tenant_record.id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', p_tenant_slug;
  END IF;
  
  -- Check if user already has membership
  SELECT * INTO existing_membership 
  FROM public.memberships 
  WHERE user_id = auth.uid() AND tenant_id = tenant_record.id;
  
  -- If no membership exists, create one with community role ONLY
  IF existing_membership.id IS NULL THEN
    INSERT INTO public.memberships (user_id, tenant_id, role, status)
    VALUES (auth.uid(), tenant_record.id, 'community'::public.tenant_role, 'active');
    
    -- Set role preference to community (no self-assignment)
    INSERT INTO public.role_preferences (user_id, tenant_id, role)
    VALUES (auth.uid(), tenant_record.id, 'community')
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'community';
  END IF;
  
  -- Update active tenant in user metadata
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('active_tenant_id', tenant_record.id)
  WHERE id = auth.uid();
  
  -- Log the tenant switch for audit purposes
  INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
  VALUES (
    auth.uid(),
    tenant_record.id,
    'tenant_switch',
    jsonb_build_object('tenant_slug', p_tenant_slug, 'timestamp', now())
  );
END;
$function$;

-- Create helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id_param uuid, tenant_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE user_id = user_id_param 
    AND tenant_id = tenant_id_param 
    AND role = 'admin'::public.tenant_role 
    AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_exafy_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT (raw_app_meta_data ->> 'exafy_admin')::boolean 
    FROM auth.users 
    WHERE id = user_id_param
  ), false);
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
DROP POLICY IF EXISTS "memberships_insert_by_admins" ON public.memberships;
DROP POLICY IF EXISTS "memberships_update_by_admins" ON public.memberships;
DROP POLICY IF EXISTS "memberships_delete_by_admins" ON public.memberships;

-- Create new non-recursive RLS policies for memberships table
CREATE POLICY "memberships_select_safe" 
ON public.memberships 
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR public.is_exafy_admin(auth.uid())
  OR public.get_user_admin_status(auth.uid(), tenant_id)
);

CREATE POLICY "memberships_insert_safe" 
ON public.memberships 
FOR INSERT 
WITH CHECK (
  public.is_exafy_admin(auth.uid())
  OR public.get_user_admin_status(auth.uid(), tenant_id)
);

CREATE POLICY "memberships_update_safe" 
ON public.memberships 
FOR UPDATE 
USING (
  public.is_exafy_admin(auth.uid())
  OR public.get_user_admin_status(auth.uid(), tenant_id)
)
WITH CHECK (
  public.is_exafy_admin(auth.uid())
  OR public.get_user_admin_status(auth.uid(), tenant_id)
);

CREATE POLICY "memberships_delete_safe" 
ON public.memberships 
FOR DELETE 
USING (
  public.is_exafy_admin(auth.uid())
  OR public.get_user_admin_status(auth.uid(), tenant_id)
);