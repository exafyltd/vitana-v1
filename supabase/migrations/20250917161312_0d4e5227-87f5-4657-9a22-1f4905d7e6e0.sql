-- Fix the is_community_user function to be more reliable
CREATE OR REPLACE FUNCTION public.is_community_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has community role preference for any tenant
  IF EXISTS (
    SELECT 1 FROM public.role_preferences rp
    WHERE rp.user_id = auth.uid() AND rp.role = 'community'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has no role preferences at all (default to community)
  IF NOT EXISTS (
    SELECT 1 FROM public.role_preferences WHERE user_id = auth.uid()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user has any membership (fallback)
  IF EXISTS (
    SELECT 1 FROM public.memberships m 
    WHERE m.user_id = auth.uid() AND m.status = 'active'
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Also ensure the user has the proper role preference set up
INSERT INTO public.role_preferences (user_id, tenant_id, role)
SELECT 'c5a4daf9-190a-4a9e-9638-d6b32f85244a', '2e7528b8-472a-4356-88da-0280d4639cce', 'community'
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_preferences 
  WHERE user_id = 'c5a4daf9-190a-4a9e-9638-d6b32f85244a' 
    AND tenant_id = '2e7528b8-472a-4356-88da-0280d4639cce'
);