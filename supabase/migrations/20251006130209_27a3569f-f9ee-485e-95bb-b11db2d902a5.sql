-- Create user_activity_log table for comprehensive activity tracking
CREATE TABLE public.user_activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type   text NOT NULL,
  activity_data   jsonb NOT NULL,
  context_data    jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id      uuid,
  dedupe_key      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  ingested_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_activity_type CHECK (activity_type IN (
    'chat.message',
    'memory.create', 'memory.update', 'memory.delete', 'memory.promote',
    'wallet.transfer', 'wallet.exchange',
    'discover.view', 'discover.like', 'discover.match',
    'calendar.create', 'calendar.update', 'calendar.respond'
  ))
);

-- Performance indexes
CREATE INDEX idx_ual_user_created ON public.user_activity_log (user_id, created_at DESC);
CREATE INDEX idx_ual_type ON public.user_activity_log (activity_type);
CREATE UNIQUE INDEX idx_ual_dedupe ON public.user_activity_log (user_id, dedupe_key) 
  WHERE dedupe_key IS NOT NULL;

-- Archive table for 180d+ retention
CREATE TABLE public.user_activity_log_archive (
  LIKE public.user_activity_log INCLUDING ALL
);

-- RLS Policies
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs"
  ON public.user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON public.user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own archived logs"
  ON public.user_activity_log_archive FOR SELECT
  USING (auth.uid() = user_id);

-- Archival function (to be scheduled via cron)
CREATE OR REPLACE FUNCTION public.archive_old_activity_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Move logs older than 180 days to archive
  INSERT INTO public.user_activity_log_archive
  SELECT * FROM public.user_activity_log
  WHERE created_at < now() - interval '180 days';
  
  -- Delete from main table
  DELETE FROM public.user_activity_log
  WHERE created_at < now() - interval '180 days';
END;
$$;