-- Localize the like/comment author notifications to the recipient's language.
--
-- The original triggers (20260623000000_post_interaction_notifications.sql) wrote
-- hardcoded German title/body, so a recipient with English selected still saw
-- "Neues Like / … gefällt dein Beitrag" on their lock screen and in the bell.
--
-- This migration makes the four trigger functions locale-aware. It resolves the
-- RECIPIENT's locale exactly the way the gateway's getUserLocale() does
-- (services/gateway/src/i18n/server-locale.ts): app_users.locale, then the
-- frontend Language picker's user_preferences.stt_language (e.g. 'en-US'),
-- falling back to German. Because both the in-app bell and the push read the
-- row's title/body, localizing at creation fixes BOTH surfaces at once.
--
-- DE + EN are the GA languages; any other/unset locale falls back to German.
-- Idempotent: CREATE OR REPLACE only (the AFTER INSERT triggers from the prior
-- migration already point at these function names and are left untouched).

-- Resolve a recipient's 2-letter UI locale ('de' | 'en' | …) from server state.
CREATE OR REPLACE FUNCTION _notif_user_locale(p_user UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(split_part(lower((SELECT locale FROM app_users WHERE user_id = p_user)), '-', 1), ''),
    NULLIF(split_part(lower((SELECT stt_language FROM user_preferences WHERE user_id = p_user)), '-', 1), ''),
    'de'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── profile_posts: LIKE ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_profile_post_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;  -- skip self
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your post',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'post', 'url', '/home'),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Beitrag',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'post', 'url', '/home'),
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
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'New comment',
      COALESCE(v_name, 'Someone') || ' commented on your post',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'post', 'url', '/home'),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'Neuer Kommentar',
      COALESCE(v_name, 'Jemand') || ' hat deinen Beitrag kommentiert',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'post', 'url', '/home'),
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
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'media', 'url', '/home'),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'media', 'url', '/home'),
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
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'New comment',
      COALESCE(v_name, 'Someone') || ' commented on your video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'media', 'url', '/home'),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_comment', 'Neuer Kommentar',
      COALESCE(v_name, 'Jemand') || ' hat dein Video kommentiert',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
                         'source', 'media', 'url', '/home'),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_comment: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
