-- Fix the handle_new_user function to properly reference the tenant_role enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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