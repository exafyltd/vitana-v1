
-- Create profile_posts table
CREATE TABLE public.profile_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching user's posts
CREATE INDEX idx_profile_posts_user_id ON public.profile_posts(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read public posts
CREATE POLICY "Public posts are viewable by everyone"
  ON public.profile_posts FOR SELECT
  USING (is_public = true);

-- Authenticated users can read their own private posts
CREATE POLICY "Users can view their own posts"
  ON public.profile_posts FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create their own posts
CREATE POLICY "Users can create their own posts"
  ON public.profile_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON public.profile_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON public.profile_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_profile_posts_updated_at
  BEFORE UPDATE ON public.profile_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
