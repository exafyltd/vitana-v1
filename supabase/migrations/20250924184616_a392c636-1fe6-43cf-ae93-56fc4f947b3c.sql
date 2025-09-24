-- Add image_url column to global_community_events table
ALTER TABLE public.global_community_events 
ADD COLUMN image_url TEXT;