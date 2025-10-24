-- Add theme column to profiles table for ID card personalization
ALTER TABLE public.profiles 
ADD COLUMN theme TEXT DEFAULT 'serenity' CHECK (theme IN ('serenity', 'focus', 'expression'));