
-- Group posts table (similar to profile_posts but scoped to a group)
CREATE TABLE public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.global_community_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group post comments
CREATE TABLE public.group_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group post likes
CREATE TABLE public.group_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Indexes
CREATE INDEX idx_group_posts_group_id ON public.group_posts(group_id, created_at DESC);
CREATE INDEX idx_group_post_comments_post_id ON public.group_post_comments(post_id, created_at ASC);
CREATE INDEX idx_group_post_likes_post_id ON public.group_post_likes(post_id);

-- Enable RLS
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS for group_posts: members can read posts in their groups, authors can write
CREATE POLICY "Members can view group posts"
  ON public.group_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.global_community_group_members m
      WHERE m.group_id = group_posts.group_id AND m.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.global_community_groups g
      WHERE g.id = group_posts.group_id AND g.is_public = true
    )
  );

CREATE POLICY "Members can create group posts"
  ON public.group_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.global_community_group_members m
      WHERE m.group_id = group_posts.group_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors can update own posts"
  ON public.group_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authors can delete own posts"
  ON public.group_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for group_post_comments
CREATE POLICY "Users can view comments on accessible posts"
  ON public.group_post_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.group_posts gp
      JOIN public.global_community_groups g ON g.id = gp.group_id
      WHERE gp.id = group_post_comments.post_id
      AND (
        g.is_public = true
        OR EXISTS (
          SELECT 1 FROM public.global_community_group_members m
          WHERE m.group_id = g.id AND m.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Authenticated users can create comments"
  ON public.group_post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can delete own comments"
  ON public.group_post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS for group_post_likes
CREATE POLICY "Users can view likes"
  ON public.group_post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.group_post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.group_post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger: auto-update likes_count on group_posts
CREATE OR REPLACE FUNCTION public.update_group_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.group_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.group_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_group_post_likes_count
AFTER INSERT OR DELETE ON public.group_post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_group_post_likes_count();

-- Trigger: auto-update comments_count on group_posts
CREATE OR REPLACE FUNCTION public.update_group_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.group_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.group_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_group_post_comments_count
AFTER INSERT OR DELETE ON public.group_post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_group_post_comments_count();
