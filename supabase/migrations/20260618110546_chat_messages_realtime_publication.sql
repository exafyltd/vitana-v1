-- Add public.chat_messages to the supabase_realtime publication.
--
-- The inbox unread badge + direct/group chat live updates subscribe to
-- INSERTs on chat_messages, but the table was never added to the
-- supabase_realtime publication (only REPLICA IDENTITY FULL was set, in
-- 20260310123749). Without publication membership Supabase Realtime never
-- emits change events for the table, so the footer badge stayed stale and
-- group chat fell back to polling.
--
-- REPLICA IDENTITY FULL is already in place; this only adds the table to the
-- publication. Idempotent: skips if already present.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
    END IF;
  END IF;
END $$;

-- Ensure full row data is captured for realtime payloads (no-op if already set).
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
