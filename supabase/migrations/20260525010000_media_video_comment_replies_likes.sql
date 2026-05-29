-- One-level replies + likes for Shorts comments

-- parent_id: NULL = top-level comment; otherwise points at the comment being replied to.
-- ON DELETE CASCADE so deleting a top-level comment removes its replies.
ALTER TABLE public.media_video_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.media_video_comments(id) ON DELETE CASCADE;

-- Per-comment like counter, kept in sync by trigger below.
ALTER TABLE public.media_video_comments
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_media_video_comments_parent_id ON public.media_video_comments(parent_id);

-- Likes on comments
CREATE TABLE IF NOT EXISTS public.media_video_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.media_video_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.media_video_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes" ON public.media_video_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like comments" ON public.media_video_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments" ON public.media_video_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Keep media_video_comments.likes_count in sync
CREATE OR REPLACE FUNCTION public.sync_media_video_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.media_video_comments SET likes_count = (
      SELECT count(*) FROM public.media_video_comment_likes WHERE comment_id = NEW.comment_id
    ) WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.media_video_comments SET likes_count = (
      SELECT count(*) FROM public.media_video_comment_likes WHERE comment_id = OLD.comment_id
    ) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_sync_media_video_comment_likes_count
AFTER INSERT OR DELETE ON public.media_video_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_media_video_comment_likes_count();

CREATE INDEX IF NOT EXISTS idx_media_video_comment_likes_comment_id ON public.media_video_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_media_video_comment_likes_user_id ON public.media_video_comment_likes(user_id);
