-- VTID-04912: who is interested in a scheduled Live Room.
--
-- The original live_stream_subscribers migration (20260530120000) deliberately
-- exposed only COUNTS: "we never expose the identity of who subscribed". The
-- owner reversed that on 2026-10-06 (in chat, with the plan sparred and
-- approved): tapping the "X dabei" count on a Live Room card lists the people
-- who tapped "Notify me", visible to every signed-in member. The table's own
-- RLS stays exactly as it was (a user still reads only their own rows); this
-- SECURITY DEFINER function is the single, narrow door.
--
-- Guards:
--   - signed-in callers only (auth.uid() not null; not granted to anon);
--   - only streams a member can already see (status pending/live — mirrors the
--     community_live_streams SELECT policy, which has no tenant column);
--   - test / bot accounts never listed (notification_test_actors, and
--     service_bot_accounts when that table exists in this database) — platform
--     rule 45;
--   - result size capped at 200.
-- Idempotent (CREATE OR REPLACE), safe to re-run.

CREATE OR REPLACE FUNCTION public.get_live_stream_subscribers(p_stream_id uuid, p_limit integer DEFAULT 100)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, subscribed_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 200);
  v_has_bots boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_live_streams cls
    WHERE cls.id = p_stream_id AND cls.status IN ('pending', 'live')
  ) THEN
    RETURN;
  END IF;

  v_has_bots := EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'service_bot_accounts' AND c.column_name = 'user_id'
  );

  IF v_has_bots THEN
    RETURN QUERY EXECUTE
      'SELECT s.user_id, p.display_name, p.avatar_url, s.created_at
         FROM public.live_stream_subscribers s
         LEFT JOIN public.profiles p ON p.user_id = s.user_id
        WHERE s.stream_id = $1
          AND NOT EXISTS (SELECT 1 FROM public.notification_test_actors a WHERE a.user_id = s.user_id)
          AND NOT EXISTS (SELECT 1 FROM public.service_bot_accounts b WHERE b.user_id = s.user_id)
        ORDER BY s.created_at DESC
        LIMIT $2'
      USING p_stream_id, v_limit;
  ELSE
    RETURN QUERY
      SELECT s.user_id, p.display_name, p.avatar_url, s.created_at
        FROM public.live_stream_subscribers s
        LEFT JOIN public.profiles p ON p.user_id = s.user_id
       WHERE s.stream_id = p_stream_id
         AND NOT EXISTS (SELECT 1 FROM public.notification_test_actors a WHERE a.user_id = s.user_id)
       ORDER BY s.created_at DESC
       LIMIT v_limit;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_live_stream_subscribers(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_live_stream_subscribers(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.get_live_stream_subscribers(uuid, integer) IS
  'VTID-04912: members who tapped Notify me on a pending/live stream (test and bot accounts excluded, max 200). Owner decision 2026-10-06 reverses the identity-hiding of 20260530120000.';
