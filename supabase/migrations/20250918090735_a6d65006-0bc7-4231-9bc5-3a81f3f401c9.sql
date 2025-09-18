-- Enable realtime for global messaging tables and make it idempotent
-- 1) Ensure full row images are available for updates/inserts
ALTER TABLE public.global_messages REPLICA IDENTITY FULL;
ALTER TABLE public.global_message_threads REPLICA IDENTITY FULL;
ALTER TABLE public.global_thread_participants REPLICA IDENTITY FULL;

-- 2) Add tables to supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'global_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'global_message_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_message_threads;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'global_thread_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_thread_participants;
  END IF;
END $$;