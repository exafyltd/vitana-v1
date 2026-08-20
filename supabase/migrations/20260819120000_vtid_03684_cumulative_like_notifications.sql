-- Cumulative like notifications (VTID-03684).
--
-- Reported: when two people liked the same post before the recipient opened
-- the notification tray, each like produced its OWN "New like" push/row —
-- "Bilder Hannes liked your post" then, minutes later, "Michael Lottmann
-- liked your post" as a second, separate notification. Requested: fold
-- these into one cumulative notification, e.g. "Bilder Hannes and 2 more
-- liked your post", the way most social apps do.
--
-- notify_on_profile_post_like() / notify_on_media_upload_like() previously
-- always INSERTed a fresh user_notifications row per like. They now first
-- look for an existing UNREAD 'post_like' row for the same post — scoping
-- to unread only, so once the recipient has seen a like notification, the
-- next like starts a fresh one rather than silently reopening an old one.
-- On a match: dedupe the liker into data.actor_ids (jsonb array, using the
-- documented "array @> scalar" containment special case so a user who
-- un-likes/re-likes while the row is still unread doesn't inflate the
-- count), recompute the EN/DE cumulative title/body from the resulting
-- count, and reset push_sent_at to NULL so the existing /push-dispatch cron
-- (exafyltd/vitana-platform, scheduled-notifications.ts) picks the row back
-- up and re-sends the updated text. Both the in-app bell and push read the
-- same title/body columns, so this fixes both surfaces from one write, same
-- as the localization comment on 20260624000000 already established.
--
-- Idempotent: CREATE OR REPLACE only; the AFTER INSERT triggers already
-- point at these function names (20260623000000_post_interaction_notifications.sql).

-- ── profile_posts: LIKE ───────────────────────────────────────────────────────
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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

-- ── media_uploads: LIKE ───────────────────────────────────────────────────────
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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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
