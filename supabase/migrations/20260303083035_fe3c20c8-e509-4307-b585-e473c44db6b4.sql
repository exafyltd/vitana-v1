
-- Post likes table
CREATE TABLE public.profile_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.profile_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" ON public.profile_post_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON public.profile_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.profile_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Post comments table
CREATE TABLE public.profile_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all comments" ON public.profile_post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON public.profile_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.profile_post_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.profile_post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to sync likes_count on profile_posts
CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile_posts SET likes_count = (
      SELECT count(*) FROM public.profile_post_likes WHERE post_id = NEW.post_id
    ) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile_posts SET likes_count = (
      SELECT count(*) FROM public.profile_post_likes WHERE post_id = OLD.post_id
    ) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_sync_post_likes_count
AFTER INSERT OR DELETE ON public.profile_post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

-- Trigger to sync comments_count on profile_posts
CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile_posts SET comments_count = (
      SELECT count(*) FROM public.profile_post_comments WHERE post_id = NEW.post_id
    ) WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile_posts SET comments_count = (
      SELECT count(*) FROM public.profile_post_comments WHERE post_id = OLD.post_id
    ) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_sync_post_comments_count
AFTER INSERT OR DELETE ON public.profile_post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();

-- Indexes
CREATE INDEX idx_post_likes_post_id ON public.profile_post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON public.profile_post_likes(user_id);
CREATE INDEX idx_post_comments_post_id ON public.profile_post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON public.profile_post_comments(user_id);
