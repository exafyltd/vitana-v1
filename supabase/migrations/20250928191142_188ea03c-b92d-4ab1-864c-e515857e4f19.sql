-- Fix user profile initialization and sync for messaging system

-- 1. First, let's backfill missing global_community_profiles for existing users
INSERT INTO public.global_community_profiles (user_id, display_name, avatar_url, is_visible)
SELECT DISTINCT
  p.user_id,
  COALESCE(p.display_name, p.full_name, 'User') as display_name,
  p.avatar_url,
  true as is_visible
FROM public.profiles p
LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
WHERE gcp.user_id IS NULL
AND p.user_id IS NOT NULL;

-- 2. Update profiles table to set display_name from full_name where missing
UPDATE public.profiles 
SET display_name = COALESCE(display_name, full_name, 'User')
WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 3. Update the handle_new_user function to create both profile types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  tenant_slug text;
  tenant_record RECORD;
  user_display_name text;
BEGIN
  -- Extract tenant slug and display name from metadata
  tenant_slug := NEW.raw_user_meta_data ->> 'tenant_slug';
  user_display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Create profile with proper display_name
  INSERT INTO public.profiles (user_id, full_name, email, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    user_display_name
  );
  
  -- Create global community profile for messaging
  INSERT INTO public.global_community_profiles (user_id, display_name, is_visible)
  VALUES (
    NEW.id,
    user_display_name,
    true
  );
  
  -- Handle tenant assignment (existing logic)
  IF tenant_slug IS NOT NULL THEN
    SELECT * INTO tenant_record FROM public.tenants WHERE slug = tenant_slug LIMIT 1;
    
    IF tenant_record.id IS NOT NULL THEN
      INSERT INTO public.memberships (user_id, tenant_id, role, status)
      VALUES (NEW.id, tenant_record.id, 'community'::public.tenant_role, 'active');
      
      INSERT INTO public.role_preferences (user_id, tenant_id, role)
      VALUES (NEW.id, tenant_record.id, 'community');
      
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('active_tenant_id', tenant_record.id)
      WHERE id = NEW.id;
    END IF;
  ELSE
    -- Default tenant assignment
    SELECT * INTO tenant_record FROM public.tenants ORDER BY created_at ASC LIMIT 1;
    
    IF tenant_record.id IS NOT NULL THEN
      INSERT INTO public.memberships (user_id, tenant_id, role, status)
      VALUES (NEW.id, tenant_record.id, 'community'::public.tenant_role, 'active');
      
      INSERT INTO public.role_preferences (user_id, tenant_id, role)
      VALUES (NEW.id, tenant_record.id, 'community');
      
      UPDATE auth.users 
      SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('active_tenant_id', tenant_record.id)
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger to keep profiles and global_community_profiles in sync
CREATE OR REPLACE FUNCTION public.sync_profile_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- When profiles.display_name is updated, sync to global_community_profiles
  IF OLD.display_name IS DISTINCT FROM NEW.display_name THEN
    UPDATE public.global_community_profiles 
    SET display_name = NEW.display_name,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- When profiles.avatar_url is updated, sync to global_community_profiles
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    UPDATE public.global_community_profiles 
    SET avatar_url = NEW.avatar_url,
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_profile_changes ON public.profiles;
CREATE TRIGGER sync_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_display_name();