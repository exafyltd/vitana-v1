-- Create media_videos table for shorts and video content
CREATE TABLE IF NOT EXISTS public.media_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  language TEXT,
  src_url TEXT NOT NULL,
  thumbnail_url TEXT,
  captions_url TEXT,
  duration_sec INTEGER,
  width INTEGER,
  height INTEGER,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_videos ENABLE ROW LEVEL SECURITY;

-- Everyone can view published videos
CREATE POLICY "Anyone can view published videos"
  ON public.media_videos
  FOR SELECT
  USING (status = 'published');

-- Users can insert their own videos
CREATE POLICY "Users can insert their own videos"
  ON public.media_videos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own videos
CREATE POLICY "Users can update their own videos"
  ON public.media_videos
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
  ON public.media_videos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_media_videos_user_id ON public.media_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_media_videos_created_at ON public.media_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_videos_tags ON public.media_videos USING GIN(tags);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_media_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_videos_updated_at
  BEFORE UPDATE ON public.media_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_media_videos_updated_at();

-- Create storage bucket for media if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/webm', 'video/ogg', 'image/jpeg', 'image/png', 'text/vtt']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Public read access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'shorts' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Create media_events table for tracking interactions
CREATE TABLE IF NOT EXISTS public.media_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  media_id UUID NOT NULL,
  media_type TEXT NOT NULL, -- 'video', 'music', 'podcast'
  event_type TEXT NOT NULL, -- 'play_start', 'play_25', 'play_50', 'play_100', 'like', 'share'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events
CREATE POLICY "Anyone can insert media events"
  ON public.media_events
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own events
CREATE POLICY "Users can view their own events"
  ON public.media_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for analytics
CREATE INDEX IF NOT EXISTS idx_media_events_media_id ON public.media_events(media_id);
CREATE INDEX IF NOT EXISTS idx_media_events_type ON public.media_events(event_type);
CREATE INDEX IF NOT EXISTS idx_media_events_created_at ON public.media_events(created_at DESC);