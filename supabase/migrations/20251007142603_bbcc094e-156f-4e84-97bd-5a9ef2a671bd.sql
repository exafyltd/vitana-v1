-- Ensure user_follow_counts view exists with proper security
DROP VIEW IF EXISTS public.user_follow_counts CASCADE;

-- Create the view with SECURITY INVOKER to respect RLS
CREATE VIEW public.user_follow_counts
WITH (security_invoker=on)
AS
SELECT 
  p.user_id,
  COALESCE(followers.count, 0) AS followers_count,
  COALESCE(following.count, 0) AS following_count
FROM public.profiles p
LEFT JOIN (
  SELECT 
    following_id AS user_id,
    COUNT(*) AS count
  FROM public.user_follows
  GROUP BY following_id
) followers ON followers.user_id = p.user_id
LEFT JOIN (
  SELECT 
    follower_id AS user_id,
    COUNT(*) AS count
  FROM public.user_follows
  GROUP BY follower_id
) following ON following.user_id = p.user_id;

-- Grant SELECT to authenticated users
GRANT SELECT ON public.user_follow_counts TO authenticated;

-- Update get_user_follow_counts function with better error handling
CREATE OR REPLACE FUNCTION public.get_user_follow_counts(user_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Query the view with error handling
  SELECT jsonb_build_object(
    'followers_count', COALESCE(followers_count, 0),
    'following_count', COALESCE(following_count, 0)
  )
  INTO result
  FROM public.user_follow_counts
  WHERE user_id = user_id_param;

  -- If user not found, return zeros
  IF result IS NULL THEN
    result := jsonb_build_object('followers_count', 0, 'following_count', 0);
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- If view doesn't exist or any error, calculate directly
    SELECT jsonb_build_object(
      'followers_count', COALESCE(
        (SELECT COUNT(*) FROM public.user_follows WHERE following_id = user_id_param), 
        0
      ),
      'following_count', COALESCE(
        (SELECT COUNT(*) FROM public.user_follows WHERE follower_id = user_id_param), 
        0
      )
    ) INTO result;
    RETURN result;
END;
$$;