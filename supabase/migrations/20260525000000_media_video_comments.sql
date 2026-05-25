-- Comments for media_videos (Shorts in Media Hub)

-- Track comment count on the parent video (mirrors likes_count / shares_count)
ALTER TABLE public.media_videos
  ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- Comments table — mirrors profile_post_comments
CREATE TABLE IF NOT EXISTS public.media_video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.media_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.media_video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video comments" ON public.media_video_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create video comments" ON public.media_video_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video comments" ON public.media_video_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own video comments" ON public.media_video_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Keep media_videos.comments_count in sync
CREATE OR REPLACE FUNCTION public.sync_media_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.media_videos SET comments_count = (
      SELECT count(*) FROM public.media_video_comments WHERE video_id = NEW.video_id
    ) WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.media_videos SET comments_count = (
      SELECT count(*) FROM public.media_video_comments WHERE video_id = OLD.video_id
    ) WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_sync_media_video_comments_count
AFTER INSERT OR DELETE ON public.media_video_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_media_video_comments_count();

-- Bump updated_at on edit (reuses existing helper)
CREATE TRIGGER update_media_video_comments_updated_at
  BEFORE UPDATE ON public.media_video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_videos_updated_at();

CREATE INDEX IF NOT EXISTS idx_media_video_comments_video_id ON public.media_video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_media_video_comments_user_id ON public.media_video_comments(user_id);
