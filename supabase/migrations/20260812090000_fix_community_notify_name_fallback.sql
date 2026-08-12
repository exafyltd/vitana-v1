-- Fix: community notifications (new post/video, like, comment, follow,
-- mention) showed the generic fallback "Jemand"/"Someone" instead of the
-- actor's name.
--
-- Reported live: a push notification for a new post read "Jemand hat einen
-- neuen Beitrag geteilt" for author @husam111. Every notification trigger in
-- this family resolves the actor's name with:
--
--   SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = ...;
--
-- That only ever looks at profiles.display_name. When it's NULL/blank —
-- which happens for accounts whose signup path didn't populate it, or that
-- were backfilled before 20260503000100's display_name-derived generator —
-- COALESCE(v_name, 'Jemand'/'Someone') always lands on the hardcoded
-- fallback, even though the same profiles row has a perfectly good handle
-- (profiles.vitana_id, mirrored to profiles.handle per 20260427000600) that
-- was never consulted.
--
-- Fix: fall back to the vitana_id handle (prefixed with '@', since it's a
-- handle, not a name) before giving up and using 'Jemand'/'Someone'. Applied
-- identically to every trigger function in the family (all idempotent
-- CREATE OR REPLACE, matching how each was originally shipped).

-- ── profile_posts / media_uploads: PUBLISH (20260630120000, redefined 20260805160000) ──
CREATE OR REPLACE FUNCTION notify_community_on_public_post()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_url TEXT;
BEGIN
  IF _notif_is_test_actor(NEW.user_id) THEN RETURN NEW; END IF;  -- VTID-03506

  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.user_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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
  WHERE ut.tenant_id = v_tenant AND ut.user_id <> NEW.user_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_community_on_public_post: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_community_on_public_video()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_url TEXT;
BEGIN
  IF _notif_is_test_actor(NEW.user_id) THEN RETURN NEW; END IF;  -- VTID-03506

  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.user_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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

-- ── profile_posts / media_uploads: LIKE + COMMENT (20260625000000) ────────────
CREATE OR REPLACE FUNCTION notify_on_profile_post_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;  -- skip self
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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

CREATE OR REPLACE FUNCTION notify_on_profile_post_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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

CREATE OR REPLACE FUNCTION notify_on_media_upload_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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

CREATE OR REPLACE FUNCTION notify_on_media_upload_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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

-- ── user_follows: NEW FOLLOWER (20260708120000) ───────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_new_follower()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  IF NEW.following_id = NEW.follower_id THEN RETURN NEW; END IF;  -- defense-in-depth; table CHECK already blocks this
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.following_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;  -- tenant_id is NOT NULL
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.follower_id;
  v_locale := _notif_user_locale(NEW.following_id);
  v_url := '/u/' || NEW.follower_id::text;

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (NEW.following_id, v_tenant, 'new_follower', 'New follower',
      COALESCE(v_name, 'Someone') || ' started following you',
      jsonb_build_object('follower_id', NEW.follower_id::text, 'actor_id', NEW.follower_id::text, 'url', v_url),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (NEW.following_id, v_tenant, 'new_follower', 'Neuer Follower',
      COALESCE(v_name, 'Jemand') || ' folgt dir jetzt',
      jsonb_build_object('follower_id', NEW.follower_id::text, 'actor_id', NEW.follower_id::text, 'url', v_url),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_new_follower: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── profile_posts: MENTION (20260716000000) ────────────────────────────────────
CREATE OR REPLACE FUNCTION _dispatch_post_mention_notifications(
  p_post_id UUID, p_author_id UUID, p_mentions JSONB
) RETURNS VOID AS $$
DECLARE
  v_mention JSONB;
  v_tagged_user UUID;
  v_tenant UUID;
  v_name TEXT;
  v_locale TEXT;
  v_url TEXT;
BEGIN
  v_url := '/post/post/' || p_post_id::text;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = p_author_id;

  FOR v_mention IN SELECT value FROM jsonb_array_elements(COALESCE(p_mentions, '[]'::jsonb))
  LOOP
    v_tagged_user := NULLIF(v_mention->>'user_id', '')::uuid;
    IF v_tagged_user IS NULL OR v_tagged_user = p_author_id THEN
      CONTINUE;  -- skip malformed entries and self-tags
    END IF;

    SELECT tenant_id INTO v_tenant FROM user_tenants
      WHERE user_id = v_tagged_user ORDER BY is_primary DESC NULLS LAST LIMIT 1;
    IF v_tenant IS NULL THEN
      CONTINUE;  -- tenant_id is NOT NULL on user_notifications
    END IF;

    v_locale := _notif_user_locale(v_tagged_user);

    IF v_locale = 'en' THEN
      INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
      VALUES (v_tagged_user, v_tenant, 'post_mention', 'You were tagged',
        COALESCE(v_name, 'Someone') || ' tagged you in a post',
        jsonb_build_object('entity_id', p_post_id::text, 'actor_id', p_author_id::text, 'source', 'post', 'url', v_url),
        'push_and_inapp', 'p1');
    ELSE
      INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
      VALUES (v_tagged_user, v_tenant, 'post_mention', 'Du wurdest markiert',
        COALESCE(v_name, 'Jemand') || ' hat dich in einem Beitrag markiert',
        jsonb_build_object('entity_id', p_post_id::text, 'actor_id', p_author_id::text, 'source', 'post', 'url', v_url),
        'push_and_inapp', 'p1');
    END IF;
  END LOOP;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
