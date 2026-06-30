-- =============================================================================
-- Live Rooms: explicit planned duration for streams
-- =============================================================================
-- Adds `duration_minutes` to community_live_streams so a meetup has a
-- deterministic finish time (start + duration) instead of relying on the host
-- tapping "End Room". The frontend staleness guard and the backend reaper
-- (fn_reap_stale_live_streams in vitana-platform) use this to move a finished
-- room out of "Live Now" / "All Rooms" and into "Past" automatically.
--
-- Nullable: legacy rows (and any created before the create-form change) have
-- NULL and fall back to a fixed max-session cap in the reaper/guard.
-- =============================================================================

ALTER TABLE public.community_live_streams
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

COMMENT ON COLUMN public.community_live_streams.duration_minutes IS
  'Planned session length in minutes, set at creation. Finish time = COALESCE(started_at, scheduled_for) + duration_minutes. NULL = legacy/unknown (reaper falls back to a fixed cap).';

-- Helps the "Past" listing (status='ended' ordered by ended_at desc) and the
-- reaper''s scan for finished live rooms.
CREATE INDEX IF NOT EXISTS idx_community_live_streams_status_ended_at
  ON public.community_live_streams (status, ended_at DESC);
