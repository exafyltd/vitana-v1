-- Ensure user_activity_log exists with correct policies and realtime
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  context_data JSONB DEFAULT '{}'::jsonb,
  dedupe_key TEXT UNIQUE,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_activity_log' AND policyname = 'Users can insert their own activity logs'
  ) THEN
    CREATE POLICY "Users can insert their own activity logs" ON public.user_activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_activity_log' AND policyname = 'Users can view their own activity logs'
  ) THEN
    CREATE POLICY "Users can view their own activity logs" ON public.user_activity_log
    FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_activity_log' AND policyname = 'Users can delete their own activity logs'
  ) THEN
    CREATE POLICY "Users can delete their own activity logs" ON public.user_activity_log
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_created_at
  ON public.user_activity_log (user_id, created_at DESC);

-- Realtime setup (idempotent)
ALTER TABLE public.user_activity_log REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'user_activity_log'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_log';
  END IF;
END $$;
