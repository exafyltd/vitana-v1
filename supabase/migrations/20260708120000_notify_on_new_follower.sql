-- Notify a user (in-app + push) when someone new starts following them.
--
-- Mirrors notify_on_profile_post_like()/notify_on_profile_post_comment()
-- (20260623000000_post_interaction_notifications.sql +
-- 20260624000000_localize_post_interaction_notifications.sql): AFTER INSERT
-- trigger on user_follows, SECURITY DEFINER (bypasses RLS to write a
-- notification for the followed user), fail-safe EXCEPTION block so a
-- notification error never breaks the follow insert, recipient-locale
-- branch via the existing _notif_user_locale() helper. The existing
-- /push-dispatch cron (gateway) picks up user_notifications rows with
-- channel='push_and_inapp' and push_sent_at IS NULL and sends FCM +
-- Appilix push within ~30s, so no gateway change is needed.
--
-- Supersedes the dead notification insert inside follow_user() added by
-- 20251001122214_654e2dce-d030-4774-aa9d-fb1a10687679.sql, which writes into
-- the legacy `notifications` table that nothing in the current frontend
-- reads (useNotifications.ts reads user_notifications via the gateway).
-- That old INSERT is left untouched — harmless orphaned code — rather than
-- risking follow_user()'s actual follow-relationship logic.

CREATE OR REPLACE FUNCTION notify_on_new_follower()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_locale TEXT; v_url TEXT;
BEGIN
  IF NEW.following_id = NEW.follower_id THEN RETURN NEW; END IF;  -- defense-in-depth; table CHECK already blocks this
  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.following_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;  -- tenant_id is NOT NULL
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.follower_id;
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

DROP TRIGGER IF EXISTS trg_notify_new_follower ON user_follows;
CREATE TRIGGER trg_notify_new_follower AFTER INSERT ON user_follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_follower();
