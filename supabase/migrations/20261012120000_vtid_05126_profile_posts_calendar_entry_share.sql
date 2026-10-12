-- VTID-05126 — share any of my upcoming calendar entries to the feed.
--
-- Owner decision 2026-10-12: a member can share any of their own upcoming
-- entries — business, private, medical, a reminder, whatever its source — not
-- only community events and live rooms (VTID-04916). An entry that belongs to
-- a community event / live room is still shared AS that event; every other
-- entry is shared as `calendar_entry`.
--
-- Other members cannot read the author's calendar_events (owner-only RLS), so
-- a `calendar_entry` post carries a snapshot of what the member chose to show:
-- title (the member may rename it), start/end time, emoji, status, and the
-- place only when they chose to show it. Nothing else of the entry is copied.
-- The gateway (POST /api/v1/calendar/events/:id/share-to-feed) is the only
-- writer of reference and snapshot.
--
-- This migration:
--   1. attached_ref_type also allows 'calendar_entry'.
--   2. profile_posts.attached_snapshot (jsonb), required for calendar_entry
--      and null otherwise.
--   3. The guard also keeps attached_snapshot out of client hands.
--   4. A trigger on calendar_events keeps shared snapshots current: times and
--      status follow the entry (a deleted entry reads 'cancelled'); the card
--      title the member chose is kept; the place is updated only on a card
--      that already shows one.
--   5. trg_notify_community_post: the share branch names a calendar_entry
--      from the snapshot title. Everything else is unchanged.
-- Idempotent. Tested by scripts/sql-tests/vtid-05126-calendar-entry-share.test.sql.

-- 1. The new reference type.
ALTER TABLE public.profile_posts DROP CONSTRAINT IF EXISTS profile_posts_attached_ref_type_check;
ALTER TABLE public.profile_posts ADD CONSTRAINT profile_posts_attached_ref_type_check
  CHECK (attached_ref_type IS NULL OR attached_ref_type IN ('community_event', 'live_room_session', 'calendar_entry'));

-- 2. The card a calendar_entry post carries.
ALTER TABLE public.profile_posts ADD COLUMN IF NOT EXISTS attached_snapshot jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_posts_attached_snapshot_check') THEN
    ALTER TABLE public.profile_posts ADD CONSTRAINT profile_posts_attached_snapshot_check
      CHECK ((attached_ref_type = 'calendar_entry') = (attached_snapshot IS NOT NULL));
  END IF;
END $$;

-- 3. Only the service role (the gateway) sets or changes reference and snapshot.
CREATE OR REPLACE FUNCTION public.profile_posts_guard_attached_ref()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  -- Same resolution as auth.role(): PostgREST 12+ sets only request.jwt.claims.
  v_role text := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    '');
BEGIN
  IF v_role IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' AND (NEW.attached_ref_id IS NOT NULL OR NEW.attached_snapshot IS NOT NULL) THEN
      RAISE EXCEPTION 'ATTACH_VIA_GATEWAY' USING HINT = 'Share an entry through POST /api/v1/calendar/events/:id/share-to-feed.';
    END IF;
    IF TG_OP = 'UPDATE' THEN
      NEW.attached_ref_type := OLD.attached_ref_type;
      NEW.attached_ref_id := OLD.attached_ref_id;
      -- The snapshot may change only from inside another trigger: the
      -- calendar_events sync below, fired by the member editing their own
      -- entry (that write runs as 'authenticated'). A client's own UPDATE of
      -- profile_posts is depth 1 and keeps the old snapshot.
      IF pg_trigger_depth() <= 1 THEN
        NEW.attached_snapshot := OLD.attached_snapshot;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Shared snapshots follow the entry.
CREATE OR REPLACE FUNCTION public.sync_shared_calendar_entry_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE profile_posts
       SET attached_snapshot = attached_snapshot || jsonb_build_object('status', 'cancelled')
     WHERE attached_ref_type = 'calendar_entry' AND attached_ref_id = OLD.id AND user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  UPDATE profile_posts p
     SET attached_snapshot = p.attached_snapshot
       || jsonb_build_object(
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'status', CASE WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'confirmed' END)
       || CASE WHEN p.attached_snapshot->>'location' IS NOT NULL AND NULLIF(TRIM(NEW.location), '') IS NOT NULL
               THEN jsonb_build_object('location', TRIM(NEW.location)) ELSE '{}'::jsonb END
   WHERE p.attached_ref_type = 'calendar_entry' AND p.attached_ref_id = NEW.id AND p.user_id = NEW.user_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A card that could not be refreshed must never block the member's own calendar write.
  RAISE LOG 'sync_shared_calendar_entry_snapshot: %', SQLERRM;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_calendar_events_sync_shared_snapshot ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_sync_shared_snapshot
  AFTER UPDATE OF start_time, end_time, status, location ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_shared_calendar_entry_snapshot();

DROP TRIGGER IF EXISTS trg_calendar_events_sync_shared_snapshot_delete ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_sync_shared_snapshot_delete
  AFTER DELETE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_shared_calendar_entry_snapshot();

CREATE INDEX IF NOT EXISTS idx_profile_posts_calendar_entry_ref
  ON public.profile_posts (attached_ref_id)
  WHERE attached_ref_type = 'calendar_entry';

-- 5. Notifications: the live function (VTID-04916) with one more branch.
CREATE OR REPLACE FUNCTION public.notify_community_on_public_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE v_tenant UUID; v_name TEXT; v_url TEXT; v_event TEXT;
BEGIN
  IF _notif_is_test_actor(NEW.user_id) THEN RETURN NEW; END IF;  -- VTID-03506

  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.user_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_url := '/post/post/' || NEW.id::text;

  IF NEW.attached_ref_id IS NULL THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    SELECT ut.user_id, v_tenant, 'community_post_published',
      CASE WHEN _notif_user_locale(ut.user_id) = 'en' THEN 'New post' ELSE 'Neuer Beitrag' END,
      CASE WHEN _notif_user_locale(ut.user_id) = 'en'
           THEN COALESCE(v_name, 'Someone') || ' shared a new post'
           ELSE COALESCE(v_name, 'Jemand') || ' hat einen neuen Beitrag geteilt' END,
      jsonb_build_object('entity_id', NEW.id::text, 'actor_id', NEW.user_id::text, 'source', 'post', 'url', v_url),
      'push_and_inapp', 'p2'
    FROM user_tenants ut
    WHERE ut.tenant_id = v_tenant AND ut.user_id <> NEW.user_id;
    RETURN NEW;
  END IF;

  -- VTID-04916: an event share; VTID-05126: or an own entry, named by its card.
  IF NEW.attached_ref_type = 'community_event' THEN
    SELECT NULLIF(TRIM(title), '') INTO v_event FROM global_community_events WHERE id = NEW.attached_ref_id;
  ELSIF NEW.attached_ref_type = 'calendar_entry' THEN
    v_event := NULLIF(TRIM(NEW.attached_snapshot->>'title'), '');
  ELSE
    SELECT COALESCE(NULLIF(TRIM(s.session_title), ''), NULLIF(TRIM(r.title), ''))
      INTO v_event
      FROM live_room_sessions s LEFT JOIN live_rooms r ON r.id = s.room_id
     WHERE s.id = NEW.attached_ref_id;
  END IF;

  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  SELECT ut.user_id, v_tenant, 'community_event_shared',
    CASE WHEN _notif_user_locale(ut.user_id) = 'en' THEN 'Join in?' ELSE 'Kommst du mit?' END,
    CASE WHEN _notif_user_locale(ut.user_id) = 'en'
         THEN COALESCE(v_name, 'Someone') || ' is going to ' || COALESCE('"' || v_event || '"', 'an event')
         ELSE COALESCE(v_name, 'Jemand') || ' ist dabei: ' || COALESCE('„' || v_event || '“', 'ein Event') END,
    jsonb_build_object('entity_id', NEW.id::text, 'actor_id', NEW.user_id::text, 'source', 'post', 'url', v_url,
                       'ref_type', NEW.attached_ref_type, 'ref_id', NEW.attached_ref_id::text),
    'push_and_inapp', 'p2'
  FROM user_tenants ut
  WHERE ut.tenant_id = v_tenant AND ut.user_id <> NEW.user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_notifications n
       WHERE n.user_id = ut.user_id
         AND n.type = 'community_event_shared'
         AND n.data->>'ref_id' = NEW.attached_ref_id::text
         AND n.created_at > now() - interval '24 hours');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_community_on_public_post: %', SQLERRM;
  RETURN NEW;
END; $function$;

COMMENT ON COLUMN public.profile_posts.attached_ref_type IS
  'VTID-04916/05126: community_event | live_room_session | calendar_entry — what this post shares. Set only by the gateway (share-to-feed).';
COMMENT ON COLUMN public.profile_posts.attached_ref_id IS
  'VTID-04916/05126: id of the shared event (global_community_events / live_room_sessions) or of the author''s own calendar_events row.';
COMMENT ON COLUMN public.profile_posts.attached_snapshot IS
  'VTID-05126: for calendar_entry only — {title, start_time, end_time, location (only if the author chose to show it), emoji, status}. Set by the gateway; times/status kept current by trg_calendar_events_sync_shared_snapshot.';
