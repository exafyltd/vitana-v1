-- Notify the whole community when a member PUBLISHES content — a public profile
-- post or an approved public video. Drives early engagement: every other member
-- of the author's tenant gets an in-app + push notification in the 'community'
-- category.
--
-- profile_posts / media_uploads are written directly from the frontend and the
-- ORB voice tool, so a DB trigger is the only reliable server-side hook. Mirrors
-- the existing like/comment convention in 20260623000000 /
-- 20260624000000 / 20260625000000:
--   • SECURITY DEFINER + fail-safe EXCEPTION block (never breaks the insert)
--   • tenant via user_tenants ORDER BY is_primary DESC NULLS LAST
--   • author name from profiles.display_name
--   • per-recipient locale via _notif_user_locale() (en vs de), stored title/body
--   • path-based deep-link data.url (/post/post/<id>, /post/media/<id>) — works
--     in the Appilix WebView (no query string)
--
-- Difference from like/comment: this fans out to MANY recipients (all tenant
-- members except the author) via a set-based INSERT ... SELECT, localizing each
-- row to that recipient's locale.
--
-- Push delivery is automatic: rows are inserted with push_sent_at = NULL and
-- channel 'push_and_inapp', so the gateway /push-dispatch cron sends FCM/Appilix
-- within ~30s, honoring community_notifications / push toggle / DND.

-- ── profile_posts: PUBLISH ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_community_on_public_post()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_url TEXT;
BEGIN
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.user_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;  -- tenant_id is NOT NULL on user_notifications
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_url := '/post/post/' || NEW.id::text;

  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  SELECT ut.user_id, v_tenant, 'community_post_published',
    CASE WHEN _notif_user_locale(ut.user_id) = 'en' THEN 'New post' ELSE 'Neuer Beitrag' END,
    CASE WHEN _notif_user_locale(ut.user_id) = 'en'
         THEN COALESCE(v_name, 'Someone') || ' shared a new post'
         ELSE COALESCE(v_name, 'Jemand') || ' hat einen neuen Beitrag geteilt' END,
    jsonb_build_object('entity_id', NEW.id::text, 'actor_id', NEW.user_id::text, 'source', 'post', 'url', v_url),
    'push_and_inapp', 'p2'
  FROM user_tenants ut
  WHERE ut.tenant_id = v_tenant AND ut.user_id <> NEW.user_id;  -- everyone but the author
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_community_on_public_post: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_community_post ON profile_posts;
CREATE TRIGGER trg_notify_community_post AFTER INSERT ON profile_posts
  FOR EACH ROW WHEN (NEW.is_public = true)
  EXECUTE FUNCTION notify_community_on_public_post();

-- ── media_uploads: PUBLISH (approved public video) ────────────────────────────
CREATE OR REPLACE FUNCTION notify_community_on_public_video()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_url TEXT;
BEGIN
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.user_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_url := '/post/media/' || NEW.id::text;

  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  SELECT ut.user_id, v_tenant, 'community_video_published',
    CASE WHEN _notif_user_locale(ut.user_id) = 'en' THEN 'New video' ELSE 'Neues Video' END,
    CASE WHEN _notif_user_locale(ut.user_id) = 'en'
         THEN COALESCE(v_name, 'Someone') || ' shared a new video'
         ELSE COALESCE(v_name, 'Jemand') || ' hat ein neues Video geteilt' END,
    jsonb_build_object('entity_id', NEW.id::text, 'actor_id', NEW.user_id::text, 'source', 'media', 'url', v_url),
    'push_and_inapp', 'p2'
  FROM user_tenants ut
  WHERE ut.tenant_id = v_tenant AND ut.user_id <> NEW.user_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_community_on_public_video: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- A combined INSERT OR UPDATE trigger can't reference OLD (INSERT has no OLD),
-- so use two triggers. INSERT: notify if it lands already-eligible. UPDATE:
-- notify only on the TRANSITION into eligibility (so editing an already-public
-- approved video never re-notifies).
DROP TRIGGER IF EXISTS trg_notify_community_video_ins ON media_uploads;
CREATE TRIGGER trg_notify_community_video_ins AFTER INSERT ON media_uploads
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND NEW.is_public = true AND NEW.media_type = 'video')
  EXECUTE FUNCTION notify_community_on_public_video();

DROP TRIGGER IF EXISTS trg_notify_community_video_upd ON media_uploads;
CREATE TRIGGER trg_notify_community_video_upd AFTER UPDATE ON media_uploads
  FOR EACH ROW
  WHEN (
    NEW.status = 'approved' AND NEW.is_public = true AND NEW.media_type = 'video'
    AND NOT (
      COALESCE(OLD.status, '') = 'approved'
      AND COALESCE(OLD.is_public, false) = true
      AND COALESCE(OLD.media_type, '') = 'video'
    )
  )
  EXECUTE FUNCTION notify_community_on_public_video();
