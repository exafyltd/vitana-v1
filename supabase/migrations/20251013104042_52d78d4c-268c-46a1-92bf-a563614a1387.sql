-- Add metadata column to support seed script for events
ALTER TABLE public.global_community_events
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;