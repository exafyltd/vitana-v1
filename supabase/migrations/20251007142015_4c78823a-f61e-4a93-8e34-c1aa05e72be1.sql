-- Drop the materialized view and recreate as a regular view for real-time counts
DROP MATERIALIZED VIEW IF EXISTS public.user_follow_counts;

-- Create a regular view that calculates counts in real-time
CREATE VIEW public.user_follow_counts AS
SELECT 
  user_id,
  COALESCE(followers_count, 0) AS followers_count,
  COALESCE(following_count, 0) AS following_count
FROM (
  SELECT 
    u.id AS user_id,
    (SELECT COUNT(*) FROM public.user_follows WHERE following_id = u.id) AS followers_count,
    (SELECT COUNT(*) FROM public.user_follows WHERE follower_id = u.id) AS following_count
  FROM auth.users u
) counts;

-- Grant access to authenticated users
GRANT SELECT ON public.user_follow_counts TO authenticated;

-- Update RLS policy on user_follows to allow reading follower relationships
DROP POLICY IF EXISTS "Users can view their own follow relationships" ON public.user_follows;

CREATE POLICY "Users can view follow relationships"
ON public.user_follows
FOR SELECT
USING (
  auth.uid() = follower_id 
  OR auth.uid() = following_id
  OR true -- Allow viewing all follow relationships for public profiles
);