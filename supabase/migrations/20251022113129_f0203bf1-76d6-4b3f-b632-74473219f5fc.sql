-- Create stream_recordings table
CREATE TABLE public.stream_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid REFERENCES community_live_streams(id) ON DELETE CASCADE NOT NULL,
  recording_url text NOT NULL,
  duration_seconds integer,
  file_size_bytes bigint,
  storage_path text NOT NULL,
  thumbnail_url text,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;

-- Policies (with proper type casting for co_hosts)
CREATE POLICY "Users can view recordings of accessible streams"
  ON public.stream_recordings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_live_streams cls
      WHERE cls.id = stream_recordings.stream_id
      AND (
        cls.access_level = 'public'
        OR cls.created_by = auth.uid()
        OR auth.uid()::text = ANY(cls.co_hosts)
      )
    )
  );

CREATE POLICY "Stream hosts can insert recordings"
  ON public.stream_recordings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_live_streams cls
      WHERE cls.id = stream_recordings.stream_id
      AND cls.created_by = auth.uid()
    )
  );

-- Add recording columns to community_live_streams
ALTER TABLE public.community_live_streams 
ADD COLUMN IF NOT EXISTS recording_status text DEFAULT 'not_started' CHECK (recording_status IN ('not_started', 'recording', 'processing', 'ready', 'failed'));

ALTER TABLE public.community_live_streams 
ADD COLUMN IF NOT EXISTS enable_recording boolean DEFAULT true;

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stream-recordings',
  'stream-recordings',
  true,
  5368709120, -- 5GB limit per file
  ARRAY['video/webm', 'video/mp4', 'video/x-matroska']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings
CREATE POLICY "Authenticated users can upload recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'stream-recordings'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stream-recordings');

CREATE POLICY "Authenticated users can delete their recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'stream-recordings'
    AND auth.uid() IS NOT NULL
  );