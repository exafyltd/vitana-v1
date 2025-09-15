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