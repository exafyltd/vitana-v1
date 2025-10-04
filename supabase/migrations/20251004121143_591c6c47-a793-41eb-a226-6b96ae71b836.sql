-- Update handle_new_user function to auto-populate display_name and handle
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tenant_slug text;
  tenant_record RECORD;
  user_full_name text;
  user_email text;
  generated_handle text;
BEGIN
  -- Extract data from new user
  tenant_slug := NEW.raw_user_meta_data ->> 'tenant_slug';
  user_full_name := NEW.raw_user_meta_data ->> 'full_name';
  user_email := NEW.email;
  
  -- Generate unique handle
  generated_handle := public.generate_unique_handle(
    user_full_name,  -- display_name (from full_name)
    user_full_name,  -- full_name
    user_email       -- email fallback
  );
  
  -- Create profile with display_name auto-populated from full_name
  INSERT INTO public.profiles (user_id, full_name, display_name, handle, email)
  VALUES (
    NEW.id,
    user_full_name,
    user_full_name,  -- Auto-populate display_name
    generated_handle,
    user_email
  );
  
  -- Create global community profile with same display_name
  INSERT INTO public.global_community_profiles (user_id, display_name)
  VALUES (NEW.id, user_full_name)
  ON CONFLICT (user_id) DO NOTHING;
  
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
        'community'::public.tenant_role,
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
        'community'::public.tenant_role,
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