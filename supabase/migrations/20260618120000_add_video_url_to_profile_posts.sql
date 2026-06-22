-- Add video_url to profile_posts so users can attach a video to a post
-- (the post composer previously only supported images). The media-uploads
-- storage bucket already allows video mime types (mp4, webm, quicktime, 3gpp).
ALTER TABLE public.profile_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
