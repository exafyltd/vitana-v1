-- Fix search_path security issue for update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_life_compass_updated_at
  BEFORE UPDATE ON public.life_compass
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_life_compass_subgoals_updated_at
  BEFORE UPDATE ON public.life_compass_subgoals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_memory_metadata_updated_at
  BEFORE UPDATE ON public.user_memory_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();