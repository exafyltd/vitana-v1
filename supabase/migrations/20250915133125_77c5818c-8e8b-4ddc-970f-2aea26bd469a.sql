-- Fix medical data access vulnerability in profiles table
-- Remove the problematic condition that allows anyone to view profiles with null medical fields

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Medical data access restricted" ON public.profiles;

-- Create a secure policy that properly restricts access to all profile data
-- Only allow access to:
-- 1. Profile owner themselves
-- 2. Exafy admins 
-- 3. Staff/admin members in the same tenant (for legitimate medical supervision)
CREATE POLICY "Secure profile access with medical data protection" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true OR
  EXISTS (
    SELECT 1 
    FROM memberships m1, memberships m2
    WHERE m1.user_id = auth.uid() 
    AND m1.role IN ('staff', 'admin') 
    AND m1.status = 'active'
    AND m2.user_id = profiles.user_id
    AND m1.tenant_id = m2.tenant_id
  )
);

-- Add audit logging for enhanced security monitoring
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone accesses another user's profile (not their own)
  IF auth.uid() != NEW.user_id THEN
    INSERT INTO public.audit_events (user_id, tenant_id, event_type, event_data)
    VALUES (
      auth.uid(),
      NEW.tenant_id,
      'profile_access',
      jsonb_build_object(
        'accessed_profile_user_id', NEW.user_id,
        'accessed_at', now(),
        'has_medical_data', (NEW.medical_conditions IS NOT NULL OR NEW.medications IS NOT NULL)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profile access logging
CREATE TRIGGER log_profile_access_trigger
  AFTER SELECT ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.log_profile_access();