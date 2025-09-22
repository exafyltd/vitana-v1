-- Add indexes for better presence query performance
CREATE INDEX IF NOT EXISTS idx_thread_presence_context_last_seen 
ON public.thread_presence (context, last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_thread_presence_user_context 
ON public.thread_presence (user_id, context);

-- Add function to automatically cleanup old presence records (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_presence_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.thread_presence 
  WHERE last_seen < now() - interval '7 days';
END;
$$;

-- Create trigger to automatically cleanup on presence updates
CREATE OR REPLACE FUNCTION public.trigger_cleanup_presence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run cleanup occasionally (1% chance per update)
  IF random() < 0.01 THEN
    PERFORM public.cleanup_old_presence_records();
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_cleanup_old_presence'
  ) THEN
    CREATE TRIGGER trigger_cleanup_old_presence
      AFTER INSERT OR UPDATE ON public.thread_presence
      FOR EACH ROW EXECUTE FUNCTION public.trigger_cleanup_presence();
  END IF;
END;
$$;