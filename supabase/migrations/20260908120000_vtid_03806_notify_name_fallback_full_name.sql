-- Community notifications showed the actor's @handle instead of their real
-- name (VTID-03806).
--
-- Reported live: a "New post" push/in-app notification for author @husam111
-- read "@husam111 hat einen neuen Beitrag geteilt" instead of his actual
-- name, while every other member's notifications correctly show their full
-- name. Confirmed against production data: profiles.full_name for this
-- account is 'Husam Katiela' — a real, populated name — but
-- profiles.display_name is NULL. Three accounts total are in this exact
-- state (display_name NULL, full_name populated) as of this migration.
--
-- Root cause: every trigger function in the notify_on_*/notify_community_on_*
-- family (20260630120000, 20260625000000, 20260708120000, 20260716000000,
-- 20260812090000, 20260819120000, 20260820120000) resolves the actor's name
-- with:
--
--   SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
--     INTO v_name FROM profiles WHERE user_id = ...;
--
-- This only ever consults profiles.display_name before falling straight to
-- the '@handle' rung — profiles.full_name is never read, even though it is
-- populated (from signup metadata, see 20260427000700_handle_new_user_replace.sql)
-- independently of display_name (a user-chosen nickname set during onboarding,
-- see OnboardingNameForm.tsx). A handle is not a name substitute; showing it
-- instead of an available real name is the bug 20260812090000 should have
-- fixed but didn't go far enough — it added the '@handle' rung but still
-- skipped the one column that actually holds the answer for these accounts.
--
-- Fix: insert full_name as a fallback rung between display_name and the
-- handle: COALESCE(display_name, full_name, '@handle'). The handle rung is
-- kept as the final fallback for accounts with genuinely no name anywhere
-- (neither column ever populated) — that's a real data gap, not something
-- this migration can manufacture, and 'Jemand'/'Someone' remains the
-- fallback after that.
--
-- Applied identically to every trigger function in the family, matching
-- 20260812090000's own established pattern for a family-wide fallback
-- change. All idempotent CREATE OR REPLACE, matching how each was
-- originally shipped. Function bodies are otherwise byte-for-byte identical
-- to their current live definitions (20260812090000 for the first eight,
-- 20260819120000's cumulative-like versions for the two 'like' functions,
-- 20260820120000 for the four comment-like/reply functions) — only the
-- v_name SELECT line changes.

-- ── profile_posts / media_uploads: PUBLISH (20260630120000, redefined 20260805160000, 20260812090000) ──
CREATE OR REPLACE FUNCTION notify_community_on_public_post()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_url TEXT;
BEGIN
  IF _notif_is_test_actor(NEW.user_id) THEN RETURN NEW; END IF;  -- VTID-03506

  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.user_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

-- ── profile_posts / media_uploads: COMMENT (20260625000000, redefined 20260812090000) ──
CREATE OR REPLACE FUNCTION notify_on_profile_post_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

CREATE OR REPLACE FUNCTION notify_on_media_upload_comment()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

-- ── user_follows: NEW FOLLOWER (20260708120000, redefined 20260812090000) ──
CREATE OR REPLACE FUNCTION notify_on_new_follower()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  IF NEW.following_id = NEW.follower_id THEN RETURN NEW; END IF;  -- defense-in-depth; table CHECK already blocks this
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.following_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;  -- tenant_id is NOT NULL
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

-- ── profile_posts: MENTION (20260716000000, redefined 20260812090000) ──
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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

-- ── profile_posts / media_uploads: LIKE, cumulative (20260819120000) ──
CREATE OR REPLACE FUNCTION notify_on_profile_post_like()
RETURNS TRIGGER AS $$
DECLARE
  v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
  v_existing_id UUID; v_actor_ids JSONB; v_count INT; v_others INT;
BEGIN
  SELECT user_id INTO v_author FROM profile_posts WHERE id = NEW.post_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;  -- skip self
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);
  v_url := '/post/post/' || NEW.post_id::text;

  -- Fold into an existing UNREAD like notification for this post, if any.
  -- A row written by the pre-VTID-03684 trigger carries data.actor_id but no
  -- data.actor_ids (that key simply doesn't exist yet) — seed the array from
  -- the legacy actor_id in that case, or the first post-deploy like on an
  -- already-unread post would silently drop the earlier liker from the count.
  SELECT id, COALESCE(
      data -> 'actor_ids',
      CASE WHEN data ->> 'actor_id' IS NOT NULL THEN jsonb_build_array(data ->> 'actor_id') ELSE '[]'::jsonb END
    ) INTO v_existing_id, v_actor_ids
    FROM user_notifications
    WHERE user_id = v_author AND type = 'post_like' AND read_at IS NULL
      AND data ->> 'entity_id' = NEW.post_id::text AND data ->> 'source' = 'post'
    ORDER BY created_at DESC LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF NOT (v_actor_ids @> to_jsonb(NEW.user_id::text)) THEN
      v_actor_ids := v_actor_ids || to_jsonb(NEW.user_id::text);
    END IF;
    v_count := jsonb_array_length(v_actor_ids);
    v_others := v_count - 1;

    UPDATE user_notifications SET
      title = CASE WHEN v_locale = 'en' THEN 'New like' ELSE 'Neues Like' END,
      body = CASE
        WHEN v_others <= 0 THEN
          CASE WHEN v_locale = 'en' THEN COALESCE(v_name, 'Someone') || ' liked your post'
               ELSE COALESCE(v_name, 'Jemand') || ' gefällt dein Beitrag' END
        WHEN v_locale = 'en' THEN
          COALESCE(v_name, 'Someone') || ' and ' || v_others || ' more liked your post'
        WHEN v_others = 1 THEN
          COALESCE(v_name, 'Jemand') || ' und 1 weiteren Person gefällt dein Beitrag'
        ELSE
          COALESCE(v_name, 'Jemand') || ' und ' || v_others || ' weiteren Personen gefällt dein Beitrag'
      END,
      data = jsonb_build_object(
        'entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
        'actor_ids', v_actor_ids, 'like_count', v_count,
        'source', 'post', 'url', v_url
      ),
      push_sent_at = NULL
    WHERE id = v_existing_id;
    RETURN NEW;
  END IF;

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your post',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
        'actor_ids', jsonb_build_array(NEW.user_id::text), 'like_count', 1, 'source', 'post', 'url', v_url),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Beitrag',
      jsonb_build_object('entity_id', NEW.post_id::text, 'actor_id', NEW.user_id::text,
        'actor_ids', jsonb_build_array(NEW.user_id::text), 'like_count', 1, 'source', 'post', 'url', v_url),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_media_upload_like()
RETURNS TRIGGER AS $$
DECLARE
  v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
  v_existing_id UUID; v_actor_ids JSONB; v_count INT; v_others INT;
BEGIN
  SELECT user_id INTO v_author FROM media_uploads WHERE id = NEW.upload_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);
  v_url := '/post/media/' || NEW.upload_id::text;

  SELECT id, COALESCE(
      data -> 'actor_ids',
      CASE WHEN data ->> 'actor_id' IS NOT NULL THEN jsonb_build_array(data ->> 'actor_id') ELSE '[]'::jsonb END
    ) INTO v_existing_id, v_actor_ids
    FROM user_notifications
    WHERE user_id = v_author AND type = 'post_like' AND read_at IS NULL
      AND data ->> 'entity_id' = NEW.upload_id::text AND data ->> 'source' = 'media'
    ORDER BY created_at DESC LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    IF NOT (v_actor_ids @> to_jsonb(NEW.user_id::text)) THEN
      v_actor_ids := v_actor_ids || to_jsonb(NEW.user_id::text);
    END IF;
    v_count := jsonb_array_length(v_actor_ids);
    v_others := v_count - 1;

    UPDATE user_notifications SET
      title = CASE WHEN v_locale = 'en' THEN 'New like' ELSE 'Neues Like' END,
      body = CASE
        WHEN v_others <= 0 THEN
          CASE WHEN v_locale = 'en' THEN COALESCE(v_name, 'Someone') || ' liked your video'
               ELSE COALESCE(v_name, 'Jemand') || ' gefällt dein Video' END
        WHEN v_locale = 'en' THEN
          COALESCE(v_name, 'Someone') || ' and ' || v_others || ' more liked your video'
        WHEN v_others = 1 THEN
          COALESCE(v_name, 'Jemand') || ' und 1 weiteren Person gefällt dein Video'
        ELSE
          COALESCE(v_name, 'Jemand') || ' und ' || v_others || ' weiteren Personen gefällt dein Video'
      END,
      data = jsonb_build_object(
        'entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
        'actor_ids', v_actor_ids, 'like_count', v_count,
        'source', 'media', 'url', v_url
      ),
      push_sent_at = NULL
    WHERE id = v_existing_id;
    RETURN NEW;
  END IF;

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
        'actor_ids', jsonb_build_array(NEW.user_id::text), 'like_count', 1, 'source', 'media', 'url', v_url),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'post_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Video',
      jsonb_build_object('entity_id', NEW.upload_id::text, 'actor_id', NEW.user_id::text,
        'actor_ids', jsonb_build_array(NEW.user_id::text), 'like_count', 1, 'source', 'media', 'url', v_url),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── comment likes / comment replies (20260820120000) ──
CREATE OR REPLACE FUNCTION notify_on_profile_post_comment_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_post_id UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  SELECT user_id, post_id INTO v_author, v_post_id
    FROM profile_post_comments WHERE id = NEW.comment_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;  -- skip self
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your comment',
      jsonb_build_object('entity_id', NEW.comment_id::text, 'actor_id', NEW.user_id::text,
        'source', 'post', 'url', '/post/post/' || v_post_id::text),
      'push_and_inapp', 'p2');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Kommentar',
      jsonb_build_object('entity_id', NEW.comment_id::text, 'actor_id', NEW.user_id::text,
        'source', 'post', 'url', '/post/post/' || v_post_id::text),
      'push_and_inapp', 'p2');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_comment_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_profile_post_comment_reply()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;  -- only replies
  SELECT user_id INTO v_author FROM profile_post_comments WHERE id = NEW.parent_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;  -- skip self
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_reply', 'New reply',
      COALESCE(v_name, 'Someone') || ' replied to your comment',
      jsonb_build_object('entity_id', NEW.parent_id::text, 'actor_id', NEW.user_id::text,
        'source', 'post', 'url', '/post/post/' || NEW.post_id::text),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_reply', 'Neue Antwort',
      COALESCE(v_name, 'Jemand') || ' hat auf deinen Kommentar geantwortet',
      jsonb_build_object('entity_id', NEW.parent_id::text, 'actor_id', NEW.user_id::text,
        'source', 'post', 'url', '/post/post/' || NEW.post_id::text),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_comment_reply: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_media_upload_comment_like()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_upload_id UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  SELECT user_id, upload_id INTO v_author, v_upload_id
    FROM media_upload_comments WHERE id = NEW.comment_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_like', 'New like',
      COALESCE(v_name, 'Someone') || ' liked your comment',
      jsonb_build_object('entity_id', NEW.comment_id::text, 'actor_id', NEW.user_id::text,
        'source', 'media', 'url', '/post/media/' || v_upload_id::text),
      'push_and_inapp', 'p2');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_like', 'Neues Like',
      COALESCE(v_name, 'Jemand') || ' gefällt dein Kommentar',
      jsonb_build_object('entity_id', NEW.comment_id::text, 'actor_id', NEW.user_id::text,
        'source', 'media', 'url', '/post/media/' || v_upload_id::text),
      'push_and_inapp', 'p2');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_comment_like: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_media_upload_comment_reply()
RETURNS TRIGGER AS $$
DECLARE v_author UUID; v_tenant UUID; v_name TEXT; v_locale TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO v_author FROM media_upload_comments WHERE id = NEW.parent_id;
  IF v_author IS NULL OR v_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = v_author ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = NEW.user_id;
  v_locale := _notif_user_locale(v_author);

  IF v_locale = 'en' THEN
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_reply', 'New reply',
      COALESCE(v_name, 'Someone') || ' replied to your comment',
      jsonb_build_object('entity_id', NEW.parent_id::text, 'actor_id', NEW.user_id::text,
        'source', 'media', 'url', '/post/media/' || NEW.upload_id::text),
      'push_and_inapp', 'p1');
  ELSE
    INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
    VALUES (v_author, v_tenant, 'comment_reply', 'Neue Antwort',
      COALESCE(v_name, 'Jemand') || ' hat auf deinen Kommentar geantwortet',
      jsonb_build_object('entity_id', NEW.parent_id::text, 'actor_id', NEW.user_id::text,
        'source', 'media', 'url', '/post/media/' || NEW.upload_id::text),
      'push_and_inapp', 'p1');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_comment_reply: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
