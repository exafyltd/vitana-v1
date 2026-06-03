-- Live stream "Notify me" subscribers.
--
-- Re-apply trigger 2026-05-31: re-runs the apply-live-subscribers-migration
-- workflow so the table/RPC are guaranteed present in prod (Notify-me was still
-- erroring with "Erinnerung fehlgeschlagen", i.e. the write was failing). This
-- file is idempotent (CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS), so a
-- re-run is safe.
--
-- Records who tapped "Notify me" on a scheduled session. Powers two things the
-- old UI faked with throwaway local state:
--   1. a *persistent* Notify toggle (survives refresh / device change), and
--   2. the real "X will join" counter on the card (count of subscribers),
--      replacing the always-0 live `viewer_count` that scheduled cards used.

CREATE TABLE IF NOT EXISTS public.live_stream_subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id  UUID NOT NULL REFERENCES public.community_live_streams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_stream_subscribers_stream
  ON public.live_stream_subscribers(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_subscribers_user
  ON public.live_stream_subscribers(user_id);

ALTER TABLE public.live_stream_subscribers ENABLE ROW LEVEL SECURITY;

-- A user only ever sees and manages their OWN subscriptions. Aggregate public
-- counts are served by the SECURITY DEFINER function below, so we never expose
-- the identity of who subscribed. (DROP IF EXISTS keeps this re-runnable.)
DROP POLICY IF EXISTS "Users can view their own stream subscriptions" ON public.live_stream_subscribers;
CREATE POLICY "Users can view their own stream subscriptions"
  ON public.live_stream_subscribers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can subscribe themselves" ON public.live_stream_subscribers;
CREATE POLICY "Users can subscribe themselves"
  ON public.live_stream_subscribers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsubscribe themselves" ON public.live_stream_subscribers;
CREATE POLICY "Users can unsubscribe themselves"
  ON public.live_stream_subscribers FOR DELETE
  USING (auth.uid() = user_id);

-- Aggregate subscriber counts for a set of streams, without exposing who
-- subscribed. Returns one row per stream that has at least one subscriber.
CREATE OR REPLACE FUNCTION public.get_live_stream_subscriber_counts(stream_ids UUID[])
RETURNS TABLE (stream_id UUID, subscriber_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.stream_id, COUNT(*)::bigint AS subscriber_count
  FROM public.live_stream_subscribers s
  WHERE s.stream_id = ANY(stream_ids)
  GROUP BY s.stream_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_stream_subscriber_counts(UUID[]) TO authenticated, anon;
