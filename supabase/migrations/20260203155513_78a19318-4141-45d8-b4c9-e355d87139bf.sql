-- Add longevity_archetype column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longevity_archetype TEXT;