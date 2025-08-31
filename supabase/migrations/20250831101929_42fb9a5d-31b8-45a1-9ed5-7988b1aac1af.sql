-- Enhanced user registration flow for multi-tenant portal system

-- Update the handle_new_user function to support tenant-specific registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  tenant_slug text;
  preferred_role text;
  tenant_record RECORD;
BEGIN
  -- Extract tenant slug and preferred role from raw_user_meta_data
  tenant_slug := NEW.raw_user_meta_data ->> 'tenant_slug';
  preferred_role := NEW.raw_user_meta_data ->> 'preferred_role';
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  
  -- If tenant_slug is provided, create membership and set role preference
  IF tenant_slug IS NOT NULL THEN
    -- Find the tenant by slug
    SELECT * INTO tenant_record FROM public.tenants WHERE slug = tenant_slug LIMIT 1;
    
    IF tenant_record.id IS NOT NULL THEN
      -- Create membership with the preferred role (default to community if not specified)
      INSERT INTO public.memberships (user_id, tenant_id, role, status)
      VALUES (
        NEW.id,
        tenant_record.id,
        COALESCE(preferred_role, 'community')::tenant_role,
        'active'
      );
      
      -- Set role preference
      INSERT INTO public.role_preferences (user_id, tenant_id, role)
      VALUES (
        NEW.id,
        tenant_record.id,
        COALESCE(preferred_role, 'community')
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
      -- Create membership with community role
      INSERT INTO public.memberships (user_id, tenant_id, role, status)
      VALUES (
        NEW.id,
        tenant_record.id,
        'community'::tenant_role,
        'active'
      );
      
      -- Set role preference
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
$$;

-- Function to handle portal-based tenant switching for authenticated users
CREATE OR REPLACE FUNCTION public.switch_to_tenant_by_slug(p_tenant_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  -- If no membership exists, create one with community role
  IF existing_membership.id IS NULL THEN
    INSERT INTO public.memberships (user_id, tenant_id, role, status)
    VALUES (auth.uid(), tenant_record.id, 'community'::tenant_role, 'active');
    
    -- Set role preference
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
$$;