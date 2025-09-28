-- Phase 1: Handle generation and validation system for ALL users

-- 1. Add unique constraint to handle column if not exists
ALTER TABLE public.profiles ADD CONSTRAINT profiles_handle_unique UNIQUE (handle);

-- 2. Create function to generate unique handles
CREATE OR REPLACE FUNCTION public.generate_unique_handle(
  p_display_name text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_handle text;
  final_handle text;
  counter integer := 1;
  name_part text;
BEGIN
  -- Determine base name from available data
  name_part := COALESCE(
    p_display_name,
    p_full_name,
    split_part(p_email, '@', 1)
  );
  
  -- Clean name and create base handle
  base_handle := lower(regexp_replace(name_part, '[^a-zA-Z0-9\s]', '', 'g'));
  base_handle := regexp_replace(base_handle, '\s+', '-', 'g');
  base_handle := regexp_replace(base_handle, '-+', '-', 'g');
  base_handle := trim(base_handle, '-');
  
  -- Fallback if name is empty or invalid
  IF base_handle = '' OR length(base_handle) < 2 THEN
    base_handle := 'user';
  END IF;
  
  -- Ensure handle is not too long
  IF length(base_handle) > 25 THEN
    base_handle := substring(base_handle from 1 for 25);
  END IF;
  
  final_handle := base_handle;
  
  -- Find unique handle by adding numbers if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE handle = final_handle) LOOP
    final_handle := base_handle || '-' || counter;
    counter := counter + 1;
    
    -- Prevent infinite loops
    IF counter > 1000 THEN
      final_handle := base_handle || '-' || extract(epoch from now())::bigint;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN final_handle;
END;
$$;

-- 3. Generate handles for ALL existing users who don't have them
UPDATE public.profiles 
SET handle = public.generate_unique_handle(display_name, full_name, email)
WHERE handle IS NULL OR handle = '';

-- 4. Update handle_new_user function to auto-generate handles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  tenant_slug text;
  tenant_record RECORD;
  user_display_name text;
  generated_handle text;
BEGIN
  -- Extract tenant slug and display name from metadata
  tenant_slug := NEW.raw_user_meta_data ->> 'tenant_slug';
  user_display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Generate unique handle
  generated_handle := public.generate_unique_handle(user_display_name, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Create profile with proper display_name and handle
  INSERT INTO public.profiles (user_id, full_name, email, display_name, handle)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    user_display_name,
    generated_handle
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

-- 5. Create function to get user profile by handle or user_id (for frontend use)
CREATE OR REPLACE FUNCTION public.get_user_profile_by_identifier(identifier text)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  full_name text,
  handle text,
  avatar_url text,
  cover_url text,
  bio text,
  email text,
  location text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First try to find by handle (if starts with @ or looks like handle)
  IF identifier ~ '^[a-z0-9_-]+$' OR identifier LIKE '@%' THEN
    RETURN QUERY
    SELECT 
      p.user_id,
      p.display_name,
      p.full_name,
      p.handle,
      p.avatar_url,
      p.cover_url,
      p.bio,
      p.email,
      gcp.location,
      p.created_at
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.handle = trim(identifier, '@')
    AND gcp.is_visible = true;
    
    -- Return if found by handle
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- Try to find by user_id (if looks like UUID)
  IF identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT 
      p.user_id,
      p.display_name,
      p.full_name,
      p.handle,
      p.avatar_url,
      p.cover_url,
      p.bio,
      p.email,
      gcp.location,
      p.created_at
    FROM public.profiles p
    LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = p.user_id
    WHERE p.user_id = identifier::uuid
    AND gcp.is_visible = true;
  END IF;
END;
$$;