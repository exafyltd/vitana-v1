-- Cleanup old triggers/functions related to follow counts (safe drops)
DO $$ BEGIN
  -- Drop possible triggers on user_follows
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_follows' AND t.tgname = 'refresh_counts_on_follow'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS refresh_counts_on_follow ON public.user_follows';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_follows' AND t.tgname = 'refresh_user_follow_counts'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS refresh_user_follow_counts ON public.user_follows';
  END IF;
END $$;

-- Drop helper functions if they exist
DROP FUNCTION IF EXISTS public.trigger_refresh_follow_counts() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_follow_counts() CASCADE;

-- Recreate/ensure the follow counts view and function
DROP VIEW IF EXISTS public.user_follow_counts CASCADE;

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

GRANT SELECT ON public.user_follow_counts TO authenticated;

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
  SELECT jsonb_build_object(
    'followers_count', COALESCE(followers_count, 0),
    'following_count', COALESCE(following_count, 0)
  )
  INTO result
  FROM public.user_follow_counts
  WHERE user_id = user_id_param;

  IF result IS NULL THEN
    result := jsonb_build_object('followers_count', 0, 'following_count', 0);
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
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