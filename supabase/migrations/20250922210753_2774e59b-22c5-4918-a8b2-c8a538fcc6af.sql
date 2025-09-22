-- Fix security warnings by setting proper search_path for functions

-- Update cleanup_old_presence_records function with proper search_path
CREATE OR REPLACE FUNCTION public.cleanup_old_presence_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.thread_presence 
  WHERE last_seen < now() - interval '7 days';
END;
$$;

-- Update trigger_cleanup_presence function with proper search_path
CREATE OR REPLACE FUNCTION public.trigger_cleanup_presence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only run cleanup occasionally (1% chance per update)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_old_presence_records();
  END IF;
  RETURN NEW;
END;
$$;