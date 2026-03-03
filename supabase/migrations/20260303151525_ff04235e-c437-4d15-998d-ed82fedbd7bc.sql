
-- Allow all authenticated users to view profiles (required for social features: 
-- community groups, followers, messaging, etc.)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
