-- ============================================================================
-- FIX: Secure User Follow Relationships
-- ============================================================================
-- SECURITY ISSUE: Current policy allows ANY user to view ALL follow relationships
-- This exposes the entire social graph and violates user privacy
-- 
-- NEW POLICY: Users can only see:
-- 1. Relationships where they are the follower (who they follow)
-- 2. Relationships where they are being followed (who follows them)
-- ============================================================================

-- Drop the insecure policy that allows viewing all follows
DROP POLICY IF EXISTS "Users can view all follows" ON public.user_follows;

-- Create secure policy with proper access control
CREATE POLICY "Users can view their own follow relationships"
ON public.user_follows
FOR SELECT
USING (
  -- User can see relationships where they are the follower
  auth.uid() = follower_id
  OR
  -- User can see relationships where they are being followed
  auth.uid() = following_id
);

-- Add comment explaining the security model
COMMENT ON POLICY "Users can view their own follow relationships" ON public.user_follows IS 
'Privacy-focused policy: Users can only see follow relationships they are directly involved in. 
This prevents social graph scraping while maintaining necessary functionality.
Follow counts are still accessible via the get_user_follow_counts() SECURITY DEFINER function.';

-- Log this security fix
INSERT INTO public.audit_events (event_type, event_data)
VALUES (
  'security_fix_user_follows',
  jsonb_build_object(
    'timestamp', now(),
    'issue', 'Unrestricted access to follow relationships',
    'fix', 'Restricted to only relationships user is involved in',
    'impact', 'Follow counts still work via RPC, realtime updates work for own relationships'
  )
);