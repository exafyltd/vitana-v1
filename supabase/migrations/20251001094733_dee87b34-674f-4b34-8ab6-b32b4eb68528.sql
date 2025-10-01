-- Create user_follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all follows"
  ON public.user_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.user_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id AND follower_id != following_id);

CREATE POLICY "Users can unfollow"
  ON public.user_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create materialized view for follow counts
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_follow_counts AS
SELECT 
  u.id as user_id,
  COALESCE(followers.count, 0) as followers_count,
  COALESCE(following.count, 0) as following_count
FROM auth.users u
LEFT JOIN (
  SELECT following_id, COUNT(*) as count
  FROM public.user_follows
  GROUP BY following_id
) followers ON u.id = followers.following_id
LEFT JOIN (
  SELECT follower_id, COUNT(*) as count
  FROM public.user_follows
  GROUP BY follower_id
) following ON u.id = following.follower_id;

-- Create index for better performance
CREATE UNIQUE INDEX IF NOT EXISTS user_follow_counts_user_id_idx ON public.user_follow_counts(user_id);
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON public.user_follows(following_id);

-- Function to refresh counts
CREATE OR REPLACE FUNCTION public.refresh_follow_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_follow_counts;
END;
$$;

-- Trigger to refresh counts on follow/unfollow
CREATE OR REPLACE FUNCTION public.trigger_refresh_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_follow_counts();
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER refresh_counts_on_follow
AFTER INSERT OR DELETE ON public.user_follows
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_follow_counts();

-- Get follow status function
CREATE OR REPLACE FUNCTION public.get_follow_status(target_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE follower_id = auth.uid()
    AND following_id = target_user_id
  );
$$;

-- Follow user function
CREATE OR REPLACE FUNCTION public.follow_user(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validation
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF auth.uid() = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot follow yourself');
  END IF;

  -- Insert follow relationship
  INSERT INTO public.user_follows (follower_id, following_id)
  VALUES (auth.uid(), target_user_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Unfollow user function
CREATE OR REPLACE FUNCTION public.unfollow_user(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validation
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Delete follow relationship
  DELETE FROM public.user_follows
  WHERE follower_id = auth.uid()
  AND following_id = target_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Get user follow counts function
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

  -- If user not in materialized view, return zeros
  IF result IS NULL THEN
    result := jsonb_build_object('followers_count', 0, 'following_count', 0);
  END IF;

  RETURN result;
END;
$$;