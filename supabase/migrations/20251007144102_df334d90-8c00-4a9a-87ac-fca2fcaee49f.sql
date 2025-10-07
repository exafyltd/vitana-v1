-- Ensure user_follows table has REPLICA IDENTITY FULL for complete real-time updates
ALTER TABLE public.user_follows REPLICA IDENTITY FULL;

-- Add to realtime publication if not already there (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'user_follows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;
  END IF;
END $$;