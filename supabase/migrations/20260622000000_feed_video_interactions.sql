-- Inline like + comment for community videos (media_uploads) on the News feed.
-- Mirrors the profile_posts pattern (profile_post_likes / profile_post_comments
-- + count-sync triggers) so media_uploads feed items gain the same per-user
-- like and comment backend that profile_posts already has.

-- media_uploads already has likes_count; add the comments_count it lacks.
ALTER TABLE public.media_uploads
  ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- Per-user likes for community videos.
CREATE TABLE IF NOT EXISTS public.media_upload_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(upload_id, user_id)
);

ALTER TABLE public.media_upload_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all video likes" ON public.media_upload_likes;
CREATE POLICY "Users can view all video likes" ON public.media_upload_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like videos" ON public.media_upload_likes;
CREATE POLICY "Users can like videos" ON public.media_upload_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike videos" ON public.media_upload_likes;
CREATE POLICY "Users can unlike videos" ON public.media_upload_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments for community videos.
CREATE TABLE IF NOT EXISTS public.media_upload_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_upload_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all video comments" ON public.media_upload_comments;
CREATE POLICY "Users can view all video comments" ON public.media_upload_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create video comments" ON public.media_upload_comments;
CREATE POLICY "Users can create video comments" ON public.media_upload_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own video comments" ON public.media_upload_comments;
CREATE POLICY "Users can update own video comments" ON public.media_upload_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own video comments" ON public.media_upload_comments;
CREATE POLICY "Users can delete own video comments" ON public.media_upload_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Keep media_uploads.likes_count in sync.
CREATE OR REPLACE FUNCTION public.sync_media_upload_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.media_uploads SET likes_count = (
      SELECT count(*) FROM public.media_upload_likes WHERE upload_id = NEW.upload_id
    ) WHERE id = NEW.upload_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.media_uploads SET likes_count = (
      SELECT count(*) FROM public.media_upload_likes WHERE upload_id = OLD.upload_id
    ) WHERE id = OLD.upload_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_media_upload_likes_count ON public.media_upload_likes;
CREATE TRIGGER trigger_sync_media_upload_likes_count
AFTER INSERT OR DELETE ON public.media_upload_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_media_upload_likes_count();

-- Keep media_uploads.comments_count in sync.
CREATE OR REPLACE FUNCTION public.sync_media_upload_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.media_uploads SET comments_count = (
      SELECT count(*) FROM public.media_upload_comments WHERE upload_id = NEW.upload_id
    ) WHERE id = NEW.upload_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.media_uploads SET comments_count = (
      SELECT count(*) FROM public.media_upload_comments WHERE upload_id = OLD.upload_id
    ) WHERE id = OLD.upload_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_media_upload_comments_count ON public.media_upload_comments;
CREATE TRIGGER trigger_sync_media_upload_comments_count
AFTER INSERT OR DELETE ON public.media_upload_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_media_upload_comments_count();

-- Indexes.
CREATE INDEX IF NOT EXISTS idx_media_upload_likes_upload_id ON public.media_upload_likes(upload_id);
CREATE INDEX IF NOT EXISTS idx_media_upload_likes_user_id ON public.media_upload_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_media_upload_comments_upload_id ON public.media_upload_comments(upload_id);
CREATE INDEX IF NOT EXISTS idx_media_upload_comments_user_id ON public.media_upload_comments(user_id);
