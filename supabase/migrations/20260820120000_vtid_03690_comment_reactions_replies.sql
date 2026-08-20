-- News Feed: reactions + one-level threaded replies on comments (VTID-03690).
--
-- Extends the two News Feed comment tables — profile_post_comments (feed
-- source 'post') and media_upload_comments (feed source 'media') — with the
-- exact same shape Shorts comments already ship for media_video_comments
-- (20260525010000_media_video_comment_replies_likes.sql): a nullable
-- parent_id for one level of threading (ON DELETE CASCADE so deleting a
-- top-level comment removes its replies), a denormalized likes_count kept in
-- sync by trigger, and a per-user comment_likes join table.
--
-- comments_count on profile_posts/media_uploads already recomputes via
-- COUNT(*) in sync_post_comments_count()/sync_media_upload_comments_count()
-- (unchanged) — replies are comments too, so the icon-row total naturally
-- includes them, matching how every mainstream feed counts threads.
--
-- Notifications: two new AFTER INSERT triggers per source (comment-like,
-- comment-reply), mirroring the locale-aware pattern established in
-- 20260624000000_localize_post_interaction_notifications.sql (resolves the
-- RECIPIENT's locale via _notif_user_locale(), already defined by that
-- migration) and linking to the specific post via /post/<source>/<id>, the
-- same route notify_on_profile_post_like() adopted in
-- 20260819120000_vtid_03684_cumulative_like_notifications.sql. These are
-- new, independent notification types (comment_like / comment_reply) — the
-- existing notify_on_profile_post_comment()/notify_on_media_upload_comment()
-- triggers (which notify the POST author on every comment, replies included)
-- are left untouched; a reply additionally notifies the COMMENT author being
-- replied to, which is a materially different, non-duplicate signal. Both
-- new triggers skip self-actions and are wrapped in the same fail-safe
-- EXCEPTION block as every other notification trigger in this file family,
-- so a notification error can never break the underlying like/reply insert.
-- The existing BEFORE INSERT sink guard on user_notifications
-- (20260805160000_vtid_03506_suppress_test_actor_notifications.sql) applies
-- automatically to these inserts too — no extra guard needed here.

-- ── profile_post_comments: threading + like counter ──────────────────────
ALTER TABLE public.profile_post_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profile_post_comments(id) ON DELETE CASCADE;
ALTER TABLE public.profile_post_comments
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profile_post_comments_parent_id ON public.profile_post_comments(parent_id);

CREATE TABLE IF NOT EXISTS public.profile_post_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.profile_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.profile_post_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profile post comment likes" ON public.profile_post_comment_likes
  FOR SELECT USING (true);
CREATE POLICY "Users can like profile post comments" ON public.profile_post_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike profile post comments" ON public.profile_post_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_profile_post_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profile_post_comments SET likes_count = (
      SELECT count(*) FROM public.profile_post_comment_likes WHERE comment_id = NEW.comment_id
    ) WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profile_post_comments SET likes_count = (
      SELECT count(*) FROM public.profile_post_comment_likes WHERE comment_id = OLD.comment_id
    ) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_profile_post_comment_likes_count ON public.profile_post_comment_likes;
CREATE TRIGGER trigger_sync_profile_post_comment_likes_count
AFTER INSERT OR DELETE ON public.profile_post_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_post_comment_likes_count();

CREATE INDEX IF NOT EXISTS idx_profile_post_comment_likes_comment_id ON public.profile_post_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_profile_post_comment_likes_user_id ON public.profile_post_comment_likes(user_id);

-- ── media_upload_comments: threading + like counter ───────────────────────
ALTER TABLE public.media_upload_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.media_upload_comments(id) ON DELETE CASCADE;
ALTER TABLE public.media_upload_comments
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_media_upload_comments_parent_id ON public.media_upload_comments(parent_id);

CREATE TABLE IF NOT EXISTS public.media_upload_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.media_upload_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.media_upload_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media upload comment likes" ON public.media_upload_comment_likes
  FOR SELECT USING (true);
CREATE POLICY "Users can like media upload comments" ON public.media_upload_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike media upload comments" ON public.media_upload_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.sync_media_upload_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.media_upload_comments SET likes_count = (
      SELECT count(*) FROM public.media_upload_comment_likes WHERE comment_id = NEW.comment_id
    ) WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.media_upload_comments SET likes_count = (
      SELECT count(*) FROM public.media_upload_comment_likes WHERE comment_id = OLD.comment_id
    ) WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_media_upload_comment_likes_count ON public.media_upload_comment_likes;
CREATE TRIGGER trigger_sync_media_upload_comment_likes_count
AFTER INSERT OR DELETE ON public.media_upload_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_media_upload_comment_likes_count();

CREATE INDEX IF NOT EXISTS idx_media_upload_comment_likes_comment_id ON public.media_upload_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_media_upload_comment_likes_user_id ON public.media_upload_comment_likes(user_id);

-- ── notifications: comment like / comment reply ───────────────────────────

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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

DROP TRIGGER IF EXISTS trg_notify_profile_post_comment_like ON profile_post_comment_likes;
CREATE TRIGGER trg_notify_profile_post_comment_like AFTER INSERT ON profile_post_comment_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_profile_post_comment_like();

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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

DROP TRIGGER IF EXISTS trg_notify_profile_post_comment_reply ON profile_post_comments;
CREATE TRIGGER trg_notify_profile_post_comment_reply AFTER INSERT ON profile_post_comments
  FOR EACH ROW WHEN (NEW.parent_id IS NOT NULL) EXECUTE FUNCTION notify_on_profile_post_comment_reply();

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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

DROP TRIGGER IF EXISTS trg_notify_media_upload_comment_like ON media_upload_comment_likes;
CREATE TRIGGER trg_notify_media_upload_comment_like AFTER INSERT ON media_upload_comment_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_media_upload_comment_like();

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
  SELECT COALESCE(NULLIF(TRIM(display_name), ''), '@' || NULLIF(TRIM(vitana_id), ''))
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

DROP TRIGGER IF EXISTS trg_notify_media_upload_comment_reply ON media_upload_comments;
CREATE TRIGGER trg_notify_media_upload_comment_reply AFTER INSERT ON media_upload_comments
  FOR EACH ROW WHEN (NEW.parent_id IS NOT NULL) EXECUTE FUNCTION notify_on_media_upload_comment_reply();
