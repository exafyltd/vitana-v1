-- Ensure realtime works for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    EXCEPTION WHEN duplicate_object THEN
      -- Already added
      NULL;
    END;
  END IF;
END $$;

-- Performance index for user scoped queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at 
  ON public.notifications (user_id, created_at DESC);
