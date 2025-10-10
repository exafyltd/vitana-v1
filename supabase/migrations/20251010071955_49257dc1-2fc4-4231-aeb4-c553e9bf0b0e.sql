-- Create media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-uploads', 
  'media-uploads', 
  true, 
  524288000,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
);

-- Main media uploads table
CREATE TABLE public.media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'podcast', 'music')),
  
  -- File information
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  duration INTEGER, -- in seconds
  
  -- Metadata
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  
  -- Stats
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  plays_count INTEGER DEFAULT 0,
  
  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_by UUID,
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Podcast-specific metadata
CREATE TABLE public.podcast_metadata (
  media_id UUID PRIMARY KEY REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  host_name TEXT,
  guest_name TEXT,
  episode_number INTEGER,
  season_number INTEGER,
  series_name TEXT
);

-- Music-specific metadata
CREATE TABLE public.music_metadata (
  media_id UUID PRIMARY KEY REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  artist_name TEXT,
  album_name TEXT,
  genre TEXT,
  mood TEXT,
  bpm INTEGER
);

-- Video-specific metadata
CREATE TABLE public.video_metadata (
  media_id UUID PRIMARY KEY REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  video_type TEXT CHECK (video_type IN ('short', 'full', 'live_replay')),
  topic TEXT,
  resolution TEXT,
  has_captions BOOLEAN DEFAULT false
);

-- Media analytics for tracking views, plays, likes
CREATE TABLE public.media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL CHECK (action IN ('view', 'play', 'like', 'share', 'download')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_media_uploads_user_id ON public.media_uploads(user_id);
CREATE INDEX idx_media_uploads_type ON public.media_uploads(media_type);
CREATE INDEX idx_media_uploads_status ON public.media_uploads(status);
CREATE INDEX idx_media_uploads_created_at ON public.media_uploads(created_at DESC);
CREATE INDEX idx_media_analytics_media_id ON public.media_analytics(media_id);
CREATE INDEX idx_media_analytics_action ON public.media_analytics(action);

-- Enable RLS on all tables
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for media_uploads
CREATE POLICY "Users can view approved public media" ON public.media_uploads
FOR SELECT USING (
  (status = 'approved' AND is_public = true) OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('staff', 'admin')
    AND m.status = 'active'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Users can create their own media" ON public.media_uploads
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own media" ON public.media_uploads
FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('staff', 'admin')
    AND m.status = 'active'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Staff can delete media" ON public.media_uploads
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('staff', 'admin')
    AND m.status = 'active'
  ) OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- RLS Policies for metadata tables (inherit from media_uploads)
CREATE POLICY "Users can view metadata for accessible media" ON public.podcast_metadata
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = podcast_metadata.media_id
    AND (
      (m.status = 'approved' AND m.is_public = true) OR
      m.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.memberships mb
        WHERE mb.user_id = auth.uid()
        AND mb.role IN ('staff', 'admin')
        AND mb.status = 'active'
      )
    )
  )
);

CREATE POLICY "Users can manage metadata for their media" ON public.podcast_metadata
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = podcast_metadata.media_id
    AND m.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = podcast_metadata.media_id
    AND m.user_id = auth.uid()
  )
);

-- Same policies for music_metadata
CREATE POLICY "Users can view music metadata" ON public.music_metadata
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = music_metadata.media_id
    AND (
      (m.status = 'approved' AND m.is_public = true) OR
      m.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.memberships mb
        WHERE mb.user_id = auth.uid()
        AND mb.role IN ('staff', 'admin')
        AND mb.status = 'active'
      )
    )
  )
);

CREATE POLICY "Users can manage music metadata" ON public.music_metadata
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = music_metadata.media_id
    AND m.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = music_metadata.media_id
    AND m.user_id = auth.uid()
  )
);

-- Same policies for video_metadata
CREATE POLICY "Users can view video metadata" ON public.video_metadata
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = video_metadata.media_id
    AND (
      (m.status = 'approved' AND m.is_public = true) OR
      m.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.memberships mb
        WHERE mb.user_id = auth.uid()
        AND mb.role IN ('staff', 'admin')
        AND mb.status = 'active'
      )
    )
  )
);

CREATE POLICY "Users can manage video metadata" ON public.video_metadata
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = video_metadata.media_id
    AND m.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = video_metadata.media_id
    AND m.user_id = auth.uid()
  )
);

-- RLS Policies for analytics
CREATE POLICY "Users can create analytics" ON public.media_analytics
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view analytics for accessible media" ON public.media_analytics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.media_uploads m
    WHERE m.id = media_analytics.media_id
    AND (
      m.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.memberships mb
        WHERE mb.user_id = auth.uid()
        AND mb.role IN ('staff', 'admin')
        AND mb.status = 'active'
      ) OR
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
    )
  )
);

-- Storage policies for media-uploads bucket
CREATE POLICY "Users can upload their own media files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public media files are viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'media-uploads');

CREATE POLICY "Users can update their own media files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'media-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own media files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'media-uploads' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for media_uploads
ALTER TABLE public.media_uploads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_uploads;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_media_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_uploads_timestamp
BEFORE UPDATE ON public.media_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_media_uploads_updated_at();