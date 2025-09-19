-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.auto_fill_delivered_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If read_at is being set and delivered_at is null, set delivered_at to read_at
  IF NEW.read_at IS NOT NULL AND OLD.read_at IS NULL AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at = NEW.read_at;
  END IF;
  
  RETURN NEW;
END;
$$;