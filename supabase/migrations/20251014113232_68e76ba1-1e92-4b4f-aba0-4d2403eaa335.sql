-- Create podcast favorites table
CREATE TABLE IF NOT EXISTS public.podcast_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  podcast_id uuid NOT NULL REFERENCES public.media_uploads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, podcast_id)
);

-- Enable RLS
ALTER TABLE public.podcast_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.podcast_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites"
ON public.podcast_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.podcast_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_podcast_favorites_user_id ON public.podcast_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_favorites_podcast_id ON public.podcast_favorites(podcast_id);