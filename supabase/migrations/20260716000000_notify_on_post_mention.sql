-- Notify tagged community members when someone @mentions them in a post.
--
-- MentionTextarea (composer) + MentionText (renderer) already fully implement
-- tagging: mentions are written straight into profile_posts.mentions (jsonb
-- array of {user_id, display_name}) by the client SDK — there is no gateway
-- POST /posts route to hook a notification into. So, exactly like
-- notify_on_profile_post_like() / notify_on_new_follower(), this reacts via a
-- DB trigger: SECURITY DEFINER (bypasses RLS to write a notification for the
-- tagged user, not the post author), fail-safe EXCEPTION block so a bad tag
-- never blocks the post insert/update, recipient-locale branch via the
-- existing _notif_user_locale() helper (20260624000000). The existing
-- /push-dispatch cron (gateway) picks up user_notifications rows with
-- channel='push_and_inapp' and push_sent_at IS NULL and sends FCM + Appilix
-- push within ~30s, so no gateway change is needed.
--
-- Split into an INSERT path and an UPDATE path (rather than one function
-- branching on TG_OP) because OLD is not a valid reference inside an AFTER
-- INSERT trigger — referencing it unconditionally would rely on short-circuit
-- evaluation order Postgres doesn't guarantee. The UPDATE path only notifies
-- newly-added tags (diffed against OLD.mentions) so re-saving a post doesn't
-- re-notify members who were already tagged.

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
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = p_author_id;

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

-- ── profile_posts: INSERT (new post with tags) ────────────────────────────────
CREATE OR REPLACE FUNCTION notify_on_post_mention_insert()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM _dispatch_post_mention_notifications(NEW.id, NEW.user_id, NEW.mentions);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_post_mention_insert: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_post_mention_insert ON profile_posts;
CREATE TRIGGER trg_notify_post_mention_insert AFTER INSERT ON profile_posts
  FOR EACH ROW EXECUTE FUNCTION notify_on_post_mention_insert();

-- ── profile_posts: UPDATE (post edited, tags added) ───────────────────────────
CREATE OR REPLACE FUNCTION notify_on_post_mention_update()
RETURNS TRIGGER AS $$
DECLARE
  v_new_tags JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(m.value), '[]'::jsonb) INTO v_new_tags
  FROM jsonb_array_elements(COALESCE(NEW.mentions, '[]'::jsonb)) AS m
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(OLD.mentions, '[]'::jsonb)) AS old_m
    WHERE old_m.value->>'user_id' = m.value->>'user_id'
  );

  PERFORM _dispatch_post_mention_notifications(NEW.id, NEW.user_id, v_new_tags);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_on_post_mention_update: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_post_mention_update ON profile_posts;
CREATE TRIGGER trg_notify_post_mention_update AFTER UPDATE OF mentions ON profile_posts
  FOR EACH ROW WHEN (NEW.mentions IS DISTINCT FROM OLD.mentions)
  EXECUTE FUNCTION notify_on_post_mention_update();
