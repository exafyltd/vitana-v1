-- Notify post/video authors when someone likes or comments — the same way chat
-- notifications work. A DB trigger inserts the user_notifications row server-side,
-- so it fires no matter which frontend surface created the like/comment (News-feed
-- card, profile page, etc.). The existing /push-dispatch cron picks up rows with
-- push_sent_at IS NULL and sends FCM + Appilix push within ~30s.
--
-- Mirrors notify_on_tenant_message() in vitana-platform's
-- 20260225300000_chat_and_invite_notifications.sql: SECURITY DEFINER (bypasses RLS
-- to write a notification for another user), fail-safe EXCEPTION block so a
-- notification error never breaks the like/comment insert, self-action skip.
--
-- Coverage:
--   profile_post_likes / profile_post_comments  -> profile_posts (covers the
--       News-feed 'post' cards AND profile-page posts; same tables)
--   media_upload_likes / media_upload_comments  -> media_uploads (community-video
--       'media' feed cards)
-- Out of scope: the full-screen shorts feed likes a counter on media_videos
-- (no per-user row to trigger on).

-- ── profile_posts: LIKE ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_profile_post_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;  -- skip self
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;  -- tenant_id is NOT NULL
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Jemand') INTO v_name
    FROM profiles WHERE user_id = NEW.user_id;
  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
    COALESCE(v_name, 'Jemand') || ' gefällt dein Beitrag',
    jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
                       'source', 'post', 'url', '/home'),
    'push_and_inapp', 'p1');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_profile_post_like ON profile_post_likes;
CREATE TRIGGER trg_notify_profile_post_like AFTER INSERT ON profile_post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_profile_post_like();

-- ── profile_posts: COMMENT ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_profile_post_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Jemand') INTO v_name
    FROM profiles WHERE user_id = NEW.user_id;
  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  VALUES (v_author, v_tenant, 'post_comment', 'Neuer Kommentar',
    COALESCE(v_name, 'Jemand') || ' hat deinen Beitrag kommentiert',
    jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
                       'source', 'post', 'url', '/home'),
    'push_and_inapp', 'p1');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_comment: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_profile_post_comment ON profile_post_comments;
CREATE TRIGGER trg_notify_profile_post_comment AFTER INSERT ON profile_post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_profile_post_comment();

-- ── media_uploads: LIKE ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_media_upload_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Jemand') INTO v_name
    FROM profiles WHERE user_id = NEW.user_id;
  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
    COALESCE(v_name, 'Jemand') || ' gefällt dein Beitrag',
    jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
                       'source', 'media', 'url', '/home'),
    'push_and_inapp', 'p1');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_media_upload_like ON media_upload_likes;
CREATE TRIGGER trg_notify_media_upload_like AFTER INSERT ON media_upload_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_media_upload_like();

-- ── media_uploads: COMMENT ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_media_upload_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), 'Jemand') INTO v_name
    FROM profiles WHERE user_id = NEW.user_id;
  INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
  VALUES (v_author, v_tenant, 'post_comment', 'Neuer Kommentar',
    COALESCE(v_name, 'Jemand') || ' hat dein Video kommentiert',
    jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
                       'source', 'media', 'url', '/home'),
    'push_and_inapp', 'p1');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_comment: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_media_upload_comment ON media_upload_comments;
CREATE TRIGGER trg_notify_media_upload_comment AFTER INSERT ON media_upload_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_media_upload_comment();
