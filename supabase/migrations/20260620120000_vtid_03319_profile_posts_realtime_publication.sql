-- Add public.profile_posts to the supabase_realtime publication.
--
-- Launch-phase News feed (VTID-03319): while the community is small we want
-- every public post to appear in everyone's feed *immediately* so the
-- community feels alive. The feed (useAllNewsFeed) now subscribes to INSERTs
-- on profile_posts, but the table was never added to the supabase_realtime
-- publication, so Realtime emitted no change events and new posts only showed
-- up on the next refetch.
--
-- media_uploads is already published; this adds profile_posts alongside it.
-- Idempotent: skips if already present.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'profile_posts'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_posts';
    END IF;
  END IF;
END $$;

-- Capture full row data for realtime payloads (harmless if already set).
ALTER TABLE public.profile_posts REPLICA IDENTITY FULL;
