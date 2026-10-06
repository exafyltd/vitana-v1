-- VTID-04926: @mentions that work everywhere — member search, comment tags,
-- and server-side checks on who a tag may notify.
--
-- 1. search_mention_candidates(p_query, p_limit) — the ONLY source the @mention
--    picker uses for posts and comments. Replaces a direct client query on
--    global_community_profiles that (a) did not escape ILIKE wildcards (typing
--    "%" listed everyone), (b) offered the registered test/service accounts as
--    taggable members (CLAUDE.md rule 45, VTID-03991) and (c) ignored tenants.
-- 2. mentions jsonb on profile_post_comments + media_upload_comments, and an
--    AFTER INSERT trigger per table that sends `comment_mention`.
-- 3. _mention_recipient_ok(author, tagged) — shared guard used by the post and
--    comment dispatchers: never the author, never a test/service account, and
--    only members who share a tenant with the author, so a hand-crafted
--    `mentions` array cannot push to arbitrary users.
--
-- The comment_mention type is switched ON (VTID-04674 notification controls)
-- by the companion migration in exafyltd/vitana-platform; until it runs the
-- guard simply suppresses these rows. Every dispatcher is fail-safe: a bad tag
-- never blocks the post/comment write.

-- ── 1. Member search for the @mention picker ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_mention_candidates(p_query text, p_limit int DEFAULT 8)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_me uuid := auth.uid();
  v_q text := btrim(COALESCE(p_query, ''));
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 8), 1), 10);
  v_pattern text;
BEGIN
  IF v_me IS NULL OR v_q = '' OR length(v_q) > 40 THEN
    RETURN;
  END IF;
  -- Escape the ILIKE metacharacters so the member's text is matched literally.
  v_pattern := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');

  RETURN QUERY
  SELECT g.user_id, btrim(g.display_name)::text, g.avatar_url::text
  FROM global_community_profiles g
  WHERE g.is_visible
    AND NULLIF(btrim(g.display_name), '') IS NOT NULL
    AND g.user_id <> v_me
    AND g.display_name ILIKE '%' || v_pattern || '%'
    AND NOT EXISTS (SELECT 1 FROM notification_test_actors t WHERE t.user_id = g.user_id)
    AND NOT EXISTS (SELECT 1 FROM service_bot_accounts b WHERE b.user_id = g.user_id)
    AND EXISTS (
      SELECT 1 FROM user_tenants mine
      JOIN user_tenants theirs ON theirs.tenant_id = mine.tenant_id
      WHERE mine.user_id = v_me AND theirs.user_id = g.user_id
    )
  -- Names that start with the query first, then alphabetical.
  ORDER BY (g.display_name ILIKE v_pattern || '%') DESC, lower(g.display_name)
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_mention_candidates(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_mention_candidates(text, int) TO authenticated;

-- ── 2. Who a tag may notify ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._mention_recipient_ok(p_author uuid, p_tagged uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_tagged IS NOT NULL
    AND p_tagged <> p_author
    AND NOT EXISTS (SELECT 1 FROM notification_test_actors t WHERE t.user_id = p_tagged)
    AND NOT EXISTS (SELECT 1 FROM service_bot_accounts b WHERE b.user_id = p_tagged)
    AND EXISTS (
      SELECT 1 FROM user_tenants a
      JOIN user_tenants b ON b.tenant_id = a.tenant_id
      WHERE a.user_id = p_author AND b.user_id = p_tagged
    );
$$;

REVOKE ALL ON FUNCTION public._mention_recipient_ok(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Post mentions: same body as 20260908120000, plus the recipient guard and a
-- per-post dedupe (the same member listed twice is notified once).
CREATE OR REPLACE FUNCTION _dispatch_post_mention_notifications(
  p_post_id UUID, p_author_id UUID, p_mentions JSONB
) RETURNS VOID AS $$
DECLARE
  v_mention JSONB;
  v_tagged_user UUID;
  v_seen UUID[] := '{}';
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
    BEGIN
      v_tagged_user := NULLIF(v_mention->>'user_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;  -- malformed id
    END;
    IF v_tagged_user = ANY (v_seen) OR NOT _mention_recipient_ok(p_author_id, v_tagged_user) THEN
      CONTINUE;  -- duplicate, self-tag, test/service account, other tenant
    END IF;
    v_seen := v_seen || v_tagged_user;

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
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 3. Comment mentions ──────────────────────────────────────────────────────
ALTER TABLE public.profile_post_comments ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.media_upload_comments ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- p_source: 'post' (profile_posts) | 'media' (media_uploads).
-- Members who already get a push for this same comment — the post owner
-- (post_comment) and, for a reply, the parent comment's author
-- (comment_reply) — are not pushed a second time.
CREATE OR REPLACE FUNCTION _dispatch_comment_mention_notifications(
  p_source TEXT, p_entity_id UUID, p_comment_id UUID, p_author_id UUID,
  p_parent_id UUID, p_mentions JSONB
) RETURNS VOID AS $$
DECLARE
  v_mention JSONB;
  v_tagged_user UUID;
  v_seen UUID[] := '{}';
  v_owner UUID;
  v_parent_author UUID;
  v_tenant UUID;
  v_name TEXT;
  v_locale TEXT;
  v_url TEXT;
BEGIN
  IF p_source = 'media' THEN
    SELECT user_id INTO v_owner FROM media_uploads WHERE id = p_entity_id;
    IF p_parent_id IS NOT NULL THEN
      SELECT user_id INTO v_parent_author FROM media_upload_comments WHERE id = p_parent_id;
    END IF;
  ELSE
    SELECT user_id INTO v_owner FROM profile_posts WHERE id = p_entity_id;
    IF p_parent_id IS NOT NULL THEN
      SELECT user_id INTO v_parent_author FROM profile_post_comments WHERE id = p_parent_id;
    END IF;
  END IF;

  v_url := '/post/' || p_source || '/' || p_entity_id::text;
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(full_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
    INTO v_name FROM profiles WHERE user_id = p_author_id;

  FOR v_mention IN SELECT value FROM jsonb_array_elements(COALESCE(p_mentions, '[]'::jsonb))
  LOOP
    BEGIN
      v_tagged_user := NULLIF(v_mention->>'user_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;
    END;
    IF v_tagged_user = ANY (v_seen) OR NOT _mention_recipient_ok(p_author_id, v_tagged_user) THEN
      CONTINUE;
    END IF;
    v_seen := v_seen || v_tagged_user;
    IF v_tagged_user = v_owner OR v_tagged_user = v_parent_author THEN
      CONTINUE;  -- already notified about this comment
    END IF;

    SELECT tenant_id INTO v_tenant FROM user_tenants
      WHERE user_id = v_tagged_user ORDER BY is_primary DESC NULLS LAST LIMIT 1;
    IF v_tenant IS NULL THEN
      CONTINUE;
    END IF;

    v_locale := _notif_user_locale(v_tagged_user);

    IF v_locale = 'en' THEN
      INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
      VALUES (v_tagged_user, v_tenant, 'comment_mention', 'You were mentioned',
        COALESCE(v_name, 'Someone') || ' mentioned you in a comment',
        jsonb_build_object('entity_id', p_entity_id::text, 'comment_id', p_comment_id::text,
          'actor_id', p_author_id::text, 'source', 'comment', 'url', v_url),
        'push_and_inapp', 'p1');
    ELSE
      INSERT INTO user_notifications (user_id, tenant_id, type, title, body, data, channel, priority)
      VALUES (v_tagged_user, v_tenant, 'comment_mention', 'Du wurdest erwähnt',
        COALESCE(v_name, 'Jemand') || ' hat dich in einem Kommentar erwähnt',
        jsonb_build_object('entity_id', p_entity_id::text, 'comment_id', p_comment_id::text,
          'actor_id', p_author_id::text, 'source', 'comment', 'url', v_url),
        'push_and_inapp', 'p1');
    END IF;
  END LOOP;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_on_profile_post_comment_mention()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM _dispatch_comment_mention_notifications('post', NEW.post_id, NEW.id, NEW.user_id, NEW.parent_id, NEW.mentions);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_profile_post_comment_mention: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION notify_on_media_upload_comment_mention()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM _dispatch_comment_mention_notifications('media', NEW.upload_id, NEW.id, NEW.user_id, NEW.parent_id, NEW.mentions);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_media_upload_comment_mention: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_profile_post_comment_mention ON public.profile_post_comments;
CREATE TRIGGER trg_notify_profile_post_comment_mention AFTER INSERT ON public.profile_post_comments
  FOR EACH ROW WHEN (jsonb_typeof(NEW.mentions) = 'array' AND NEW.mentions <> '[]'::jsonb)
  EXECUTE FUNCTION notify_on_profile_post_comment_mention();

DROP TRIGGER IF EXISTS trg_notify_media_upload_comment_mention ON public.media_upload_comments;
CREATE TRIGGER trg_notify_media_upload_comment_mention AFTER INSERT ON public.media_upload_comments
  FOR EACH ROW WHEN (jsonb_typeof(NEW.mentions) = 'array' AND NEW.mentions <> '[]'::jsonb)
  EXECUTE FUNCTION notify_on_media_upload_comment_mention();

NOTIFY pgrst, 'reload schema';
