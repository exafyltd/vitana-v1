-- Deep-link like/comment notifications to the SPECIFIC post.
--
-- Previously data.url was '/home' (the feed). Tapping a notification therefore
-- did not open the post that was liked/commented. Point it at the dedicated
-- single-post route added in the frontend: /post/<source>/<id>
--   • profile_posts  → /post/post/<post_id>
--   • media_uploads  → /post/media/<upload_id>
-- Both the in-app deep-link handler and the Appilix/SW push tap read data.url,
-- and the route is path-based (no query string) so it works in the Appilix
-- WebView. Locale-aware title/body from 20260624000000 is preserved.
--
-- Idempotent: CREATE OR REPLACE only; the AFTER INSERT triggers already point
-- at these function names.

-- ── profile_posts: LIKE ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_profile_post_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;  -- skip self
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);
  v_url := '/post/post/' || NEW.post_id::text;

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your post',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text, 'source', 'post', 'url', v_url),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Beitrag',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text, 'source', 'post', 'url', v_url),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── profile_posts: COMMENT ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_profile_post_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);
  v_url := '/post/post/' || NEW.post_id::text;

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'New comment',
      COALESCE(v_name, 'Someone') || ' commented on your post',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text, 'source', 'post', 'url', v_url),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'Neuer Kommentar',
      COALESCE(v_name, 'Jemand') || ' hat deinen Beitrag kommentiert',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text, 'source', 'post', 'url', v_url),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_comment: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── media_uploads: LIKE ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_media_upload_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);
  v_url := '/post/media/' || NEW.upload_id::text;

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text, 'source', 'media', 'url', v_url),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text, 'source', 'media', 'url', v_url),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── media_uploads: COMMENT ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_media_upload_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);
  v_url := '/post/media/' || NEW.upload_id::text;

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'New comment',
      COALESCE(v_name, 'Someone') || ' commented on your video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text, 'source', 'media', 'url', v_url),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'Neuer Kommentar',
      COALESCE(v_name, 'Jemand') || ' hat dein Video kommentiert',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text, 'source', 'media', 'url', v_url),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_comment: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
