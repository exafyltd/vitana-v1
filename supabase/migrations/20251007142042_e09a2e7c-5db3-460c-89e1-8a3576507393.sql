-- Fix security issue: Don't expose auth.users in view
DROP VIEW IF EXISTS public.user_follow_counts;

-- Create a regular view that calculates counts WITHOUT exposing auth.users
-- Only includes users that have profiles (which is safe to expose)
CREATE VIEW public.user_follow_counts AS
SELECT 
  p.user_id,
  COALESCE(followers_count, 0) AS followers_count,
  COALESCE(following_count, 0) AS following_count
FROM public.profiles p
LEFT JOIN (
  SELECT 
    following_id AS user_id,
    COUNT(*) AS followers_count
  FROM public.user_follows
  GROUP BY following_id
) followers ON followers.user_id = p.user_id
LEFT JOIN (
  SELECT 
    follower_id AS user_id,
    COUNT(*) AS following_count
  FROM public.user_follows
  GROUP BY follower_id
) following ON following.user_id = p.user_id;

-- Grant access to authenticated users
GRANT SELECT ON public.user_follow_counts TO authenticated;