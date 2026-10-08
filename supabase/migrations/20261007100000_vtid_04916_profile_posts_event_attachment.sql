-- VTID-04916 — a post can carry the event it is about (share to feed from the calendar).
--
-- A member going to a community event (or a live room session) can post it
-- from the calendar. The post is an ordinary profile_posts row with an
-- attached reference, so the feed renders a live event card under the
-- member's own words. The gateway (POST /api/v1/calendar/events/:id/
-- share-to-feed, vitana-platform) is the only writer of the reference: it
-- checks the entry is the member's own, the event is public, not cancelled
-- and not over, and that the member has not shared it before.
--
-- This migration:
--   1. profile_posts.attached_ref_type / attached_ref_id (both or neither),
--      one share per member per event (partial unique index).
--   2. A guard: only the service role sets or changes the reference, so a
--      client cannot attach an event while skipping the gateway's checks.
--   3. trg_notify_community_post: a post WITHOUT a reference notifies exactly
--      as before (body unchanged). A post WITH one sends type
--      'community_event_shared' and skips every recipient who already got one
--      for the same event in the last 24 h — however many members share the
--      same event, a member hears about it at most once a day. New types start
--      switched off per tenant (VTID-04674) until an admin turns them on.
--   4. An index for that 24 h lookup.

ALTER TABLE public.profile_posts
  ADD COLUMN IF NOT EXISTS attached_ref_type text,
  ADD COLUMN IF NOT EXISTS attached_ref_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_posts_attached_ref_type_check') THEN
    ALTER TABLE public.profile_posts ADD CONSTRAINT profile_posts_attached_ref_type_check
      CHECK (attached_ref_type IS NULL OR attached_ref_type IN ('community_event', 'live_room_session'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_posts_attached_ref_pair_check') THEN
    ALTER TABLE public.profile_posts ADD CONSTRAINT profile_posts_attached_ref_pair_check
      CHECK ((attached_ref_type IS NULL) = (attached_ref_id IS NULL));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_posts_one_share_per_event
  ON public.profile_posts (user_id, attached_ref_type, attached_ref_id)
  WHERE attached_ref_id IS NOT NULL;

-- 2. Only the service role (the gateway) sets or changes the reference.
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
    IF TG_OP = 'INSERT' AND NEW.attached_ref_id IS NOT NULL THEN
      RAISE EXCEPTION 'ATTACH_VIA_GATEWAY' USING HINT = 'Share an event through POST /api/v1/calendar/events/:id/share-to-feed.';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.attached_ref_type IS DISTINCT FROM OLD.attached_ref_type
                             OR NEW.attached_ref_id IS DISTINCT FROM OLD.attached_ref_id) THEN
      NEW.attached_ref_type := OLD.attached_ref_type;
      NEW.attached_ref_id := OLD.attached_ref_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_profile_posts_guard_attached_ref ON public.profile_posts;
CREATE TRIGGER trg_profile_posts_guard_attached_ref
  BEFORE INSERT OR UPDATE ON public.profile_posts
  FOR EACH ROW EXECUTE FUNCTION public.profile_posts_guard_attached_ref();

-- 4. The 24 h "already told about this event" lookup.
CREATE INDEX IF NOT EXISTS idx_user_notifications_event_shared
  ON public.user_notifications (user_id, ((data->>'ref_id')), created_at DESC)
  WHERE type = 'community_event_shared';

-- 3. Notifications. The branch without a reference is the live function
--    (VTID-03506 test-actor skip, VTID-03806 name fallback) unchanged.
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

  -- VTID-04916: an event share.
  IF NEW.attached_ref_type = 'community_event' THEN
    SELECT NULLIF(TRIM(title), '') INTO v_event FROM global_community_events WHERE id = NEW.attached_ref_id;
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
  'VTID-04916: community_event | live_room_session — the event this post shares. Set only by the gateway (share-to-feed).';
COMMENT ON COLUMN public.profile_posts.attached_ref_id IS
  'VTID-04916: id of the shared event (global_community_events.id or live_room_sessions.id).';
