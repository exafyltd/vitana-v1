-- Seed global_community_profiles with existing users who have community role
INSERT INTO public.global_community_profiles (user_id, display_name, avatar_url, bio, is_visible)
SELECT DISTINCT p.user_id, 
       COALESCE(p.display_name, p.full_name, 'User'),
       p.avatar_url,
       p.bio,
       true
FROM public.profiles p
JOIN public.role_preferences rp ON p.user_id = rp.user_id
WHERE rp.role = 'community'
  AND p.user_id NOT IN (SELECT user_id FROM public.global_community_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Create secure RPC function for global community directory search
CREATE OR REPLACE FUNCTION public.search_global_directory(search_term text)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  full_name text,
  avatar_url text,
  bio text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow community users to search global directory
  IF NOT is_community_user() THEN
    RAISE EXCEPTION 'Access denied: Only community users can search global directory';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    gcp.user_id,
    gcp.display_name,
    p.full_name,
    gcp.avatar_url,
    gcp.bio,
    p.email
  FROM public.global_community_profiles gcp
  JOIN public.profiles p ON gcp.user_id = p.user_id
  WHERE gcp.is_visible = true
    AND gcp.user_id != auth.uid()
    AND (
      gcp.display_name ILIKE '%' || search_term || '%' OR
      p.full_name ILIKE '%' || search_term || '%' OR
      p.email ILIKE '%' || search_term || '%'
    )
  ORDER BY gcp.display_name
  LIMIT 10;
END;
$$;

-- Create secure RPC function for tenant directory search
CREATE OR REPLACE FUNCTION public.search_tenant_directory(search_term text, tenant_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  full_name text,
  avatar_url text,
  bio text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user has membership in the tenant
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships m 
    WHERE m.user_id = auth.uid() 
      AND m.tenant_id = tenant_id_param 
      AND m.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Access denied: No active membership in tenant';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.user_id,
    p.display_name,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.email
  FROM public.profiles p
  JOIN public.memberships m ON p.user_id = m.user_id
  WHERE m.tenant_id = tenant_id_param
    AND m.status = 'active'
    AND p.user_id != auth.uid()
    AND (
      p.display_name ILIKE '%' || search_term || '%' OR
      p.full_name ILIKE '%' || search_term || '%' OR
      p.email ILIKE '%' || search_term || '%'
    )
  ORDER BY p.display_name
  LIMIT 10;
END;
$$;