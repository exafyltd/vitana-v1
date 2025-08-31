-- PHASE 1: CRITICAL RLS POLICY IMPLEMENTATION
-- Fix missing RLS policies on critical tables

-- 1. Add RLS policies for messages table
CREATE POLICY "Users can view messages they sent or received"
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR
  (((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true
);

CREATE POLICY "Users can create messages as sender"
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own sent messages"
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own sent messages"
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- 2. Add RLS policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR
  (((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true
);

CREATE POLICY "Users can create their own profile"
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles 
FOR ALL
USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true)
WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true);

-- 3. Add RLS policies for wallet_credits table
CREATE POLICY "Users can view their own wallet credits"
ON public.wallet_credits 
FOR SELECT 
USING (
  auth.uid() = user_id OR
  (((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true
);

CREATE POLICY "Only system can create wallet credits"
ON public.wallet_credits 
FOR INSERT 
WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true);

CREATE POLICY "Only admins can manage wallet credits"
ON public.wallet_credits 
FOR ALL
USING ((((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true)
WITH CHECK ((((auth.jwt() -> 'app_metadata'::text) ->> 'exafy_admin'::text))::boolean = true);

-- PHASE 3: DATABASE FUNCTION SECURITY HARDENING
-- Add proper search_path security to all functions

CREATE OR REPLACE FUNCTION public.list_roles_for_active_tenant(p_tenant_id uuid)
RETURNS TABLE(role text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT m.role::text
  FROM public.memberships m
  WHERE m.user_id = auth.uid()
    AND m.tenant_id = p_tenant_id
    AND m.status = 'active';
$function$;

CREATE OR REPLACE FUNCTION public.get_role_preference(p_tenant_id uuid)
RETURNS TABLE(role text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT rp.role
  FROM public.role_preferences rp
  WHERE rp.user_id = auth.uid()
    AND rp.tenant_id = p_tenant_id;
$function$;

CREATE OR REPLACE FUNCTION public.set_role_preference(p_tenant_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  is_exafy_admin boolean;
BEGIN
  -- Check if user is exafy_admin using proper metadata
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
$function$;

CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(p_user_id uuid, p_user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update user's raw_app_meta_data to make them exafy_admin
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('exafy_admin', true)
  WHERE id = p_user_id;
  
  -- Create memberships for all three workspaces as admin
  INSERT INTO public.memberships (user_id, tenant_id, role, status)
  SELECT p_user_id, t.id, 'admin'::tenant_role, 'active'
  FROM public.tenants t
  WHERE t.name IN ('Maxina', 'Alkalma', 'Earthlings')
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status;
    
  -- Set the first tenant as active
  UPDATE auth.users 
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('active_tenant_id', (
      SELECT id FROM public.tenants WHERE name = 'Maxina' LIMIT 1
    ))
  WHERE id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.switch_to_tenant_by_slug(p_tenant_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    VALUES (auth.uid(), tenant_record.id, 'community'::tenant_role, 'active');
    
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  tenant_slug text;
  tenant_record RECORD;
BEGIN
  -- Extract tenant slug from raw_user_meta_data (remove role selection)
  tenant_slug := NEW.raw_user_meta_data ->> 'tenant_slug';
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  
  -- Always assign community role (no self-selection allowed)
  IF tenant_slug IS NOT NULL THEN
    -- Find the tenant by slug
    SELECT * INTO tenant_record FROM public.tenants WHERE slug = tenant_slug LIMIT 1;
    
    IF tenant_record.id IS NOT NULL THEN
      -- Create membership with community role ONLY
      INSERT INTO public.memberships (user_id, tenant_id, role, status)
      VALUES (
        NEW.id,
        tenant_record.id,
        'community'::tenant_role,
        'active'
      );
      
      -- Set role preference to community
      INSERT INTO public.role_preferences (user_id, tenant_id, role)
      VALUES (
        NEW.id,
        tenant_record.id,
        'community'
      );
      
      -- Set active tenant in user metadata
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('active_tenant_id', tenant_record.id)
      WHERE id = NEW.id;
    END IF;
  ELSE
    -- For users without tenant_slug, assign to the first available tenant with community role
    SELECT * INTO tenant_record FROM public.tenants ORDER BY created_at ASC LIMIT 1;
    
    IF tenant_record.id IS NOT NULL THEN
      -- Create membership with community role ONLY
      INSERT INTO public.memberships (user_id, tenant_id, role, status)
      VALUES (
        NEW.id,
        tenant_record.id,
        'community'::tenant_role,
        'active'
      );
      
      -- Set role preference to community
      INSERT INTO public.role_preferences (user_id, tenant_id, role)
      VALUES (
        NEW.id,
        tenant_record.id,
        'community'
      );
      
      -- Set active tenant in user metadata
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('active_tenant_id', tenant_record.id)
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;