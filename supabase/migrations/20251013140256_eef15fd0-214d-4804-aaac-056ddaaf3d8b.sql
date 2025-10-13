-- Create storage buckets for media content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('media-music', 'media-music', true, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a']),
  ('media-podcasts', 'media-podcasts', true, 104857600, ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a']),
  ('media-videos', 'media-videos', true, 524288000, ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']),
  ('media-thumbnails', 'media-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create media content table
CREATE TABLE IF NOT EXISTS public.media_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('music', 'podcast', 'video')),
  category TEXT,
  wellness_pillar TEXT CHECK (wellness_pillar IN ('Mental', 'Movement', 'Nutrition', 'Sleep', 'Hydration')),
  
  -- File storage paths
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  
  -- Metadata
  artist TEXT,
  album TEXT,
  episode_number INTEGER,
  season_number INTEGER,
  tags TEXT[] DEFAULT ARRAY[]::text[],
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_content
DROP POLICY IF EXISTS "Anyone can view public media" ON public.media_content;
CREATE POLICY "Anyone can view public media"
  ON public.media_content
  FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Users can view their own media" ON public.media_content;
CREATE POLICY "Users can view their own media"
  ON public.media_content
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own media" ON public.media_content;
CREATE POLICY "Users can insert their own media"
  ON public.media_content
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own media" ON public.media_content;
CREATE POLICY "Users can update their own media"
  ON public.media_content
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own media" ON public.media_content;
CREATE POLICY "Users can delete their own media"
  ON public.media_content
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage RLS Policies for media buckets
DROP POLICY IF EXISTS "Anyone can view media files" ON storage.objects;
CREATE POLICY "Anyone can view media files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('media-music', 'media-podcasts', 'media-videos', 'media-thumbnails'));

DROP POLICY IF EXISTS "Users can upload media music" ON storage.objects;
CREATE POLICY "Users can upload media music"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-music' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload media podcasts" ON storage.objects;
CREATE POLICY "Users can upload media podcasts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-podcasts' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload media videos" ON storage.objects;
CREATE POLICY "Users can upload media videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-videos' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can upload media thumbnails" ON storage.objects;
CREATE POLICY "Users can upload media thumbnails"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-thumbnails' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own media storage" ON storage.objects;
CREATE POLICY "Users update own media storage"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id IN ('media-music', 'media-podcasts', 'media-videos', 'media-thumbnails')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own media storage" ON storage.objects;
CREATE POLICY "Users delete own media storage"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id IN ('media-music', 'media-podcasts', 'media-videos', 'media-thumbnails')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_content_user_id ON public.media_content(user_id);
CREATE INDEX IF NOT EXISTS idx_media_content_type ON public.media_content(media_type);
CREATE INDEX IF NOT EXISTS idx_media_content_pillar ON public.media_content(wellness_pillar);
CREATE INDEX IF NOT EXISTS idx_media_content_published ON public.media_content(published_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_media_content_featured ON public.media_content(is_featured) WHERE is_featured = true;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_media_content_updated_at ON public.media_content;
CREATE TRIGGER update_media_content_updated_at
  BEFORE UPDATE ON public.media_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();