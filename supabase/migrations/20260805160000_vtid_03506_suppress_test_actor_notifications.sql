-- VTID-03506 — Test accounts must never notify real community members.
--
-- WHAT HAPPENED (2026-08-05 14:54–15:00 UTC): the shared E2E account
-- e2e-test@vitana.dev (a27552a3-0257-4305-8ed0-351a80fd3701) created 5 public
-- profile_posts against PRODUCTION while reproducing VTID-03503 (feed like /
-- comment counts vanishing after refresh). trg_notify_community_post fans out
-- to every member of the author's tenant, so those 5 inserts produced 960
-- user_notifications rows and 600 delivered pushes — real members' lock screens
-- filled with "E2E Test User shared a new post" / "E2E Test User hat einen neuen
-- Beitrag geteilt". The posts were deleted afterwards; the notifications and the
-- pushes were not, and could not be — a push is gone the moment it is sent.
--
-- WHY NOTHING STOPPED IT: the fan-out triggers only ask "is this post public?".
-- Nothing in the schema knows the difference between a member and a test rig,
-- and the E2E account is a full member of the production tenant.
--
-- WHAT THIS MIGRATION DOES — two independent layers, because the source-side
-- guard only covers the two triggers we know about today:
--   1. notification_test_actors + _notif_is_test_actor() — the registry of
--      accounts whose actions must never reach a real user.
--   2. A BEFORE INSERT guard on user_notifications itself. Every producer —
--      trigger, gateway service, edge function, one written next month — funnels
--      through this table, so this is the layer that actually holds. It reads
--      whichever actor key the producer used (actor_id / sender_id / reactor_id
--      / follower_id) and drops the row.
--   3. An early return in the two community publish fan-out functions, so the
--      960 rows are never generated in the first place rather than generated
--      and dropped one by one.
--
-- The sink guard FAILS OPEN: any error resolving the actor returns NEW and the
-- notification is delivered. Suppressing test noise is worth strictly less than
-- a real member's notification, so this trigger must never be the reason one
-- goes missing.

-- ── 1. Registry ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_test_actors (
  user_id    UUID PRIMARY KEY,
  reason     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE notification_test_actors IS
  'VTID-03506: accounts whose actions must never notify real users. Consulted by '
  '_notif_is_test_actor(); see trg_suppress_test_actor_notifications.';

-- Service-role only: RLS on with no policies. Nothing client-side reads or
-- writes this, and a leaked list of test accounts is not something to hand out.
ALTER TABLE notification_test_actors ENABLE ROW LEVEL SECURITY;

INSERT INTO notification_test_actors (user_id, reason) VALUES
  ('a27552a3-0257-4305-8ed0-351a80fd3701',
   'e2e-test@vitana.dev — the shared Playwright/API test account named in both CLAUDE.md files (VTID-03506)')
ON CONFLICT (user_id) DO NOTHING;

-- ── 2. Predicate ─────────────────────────────────────────────────────────────
-- The email patterns matter as much as the table: e2e accounts get minted ad hoc
-- (e2e-1776584490-6426@vitanatest.exafy.io and friends already exist), and one
-- created tomorrow would otherwise arrive unregistered and blast the community
-- exactly the way this migration exists to prevent.
CREATE OR REPLACE FUNCTION _notif_is_test_actor(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p_user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM notification_test_actors t WHERE t.user_id = p_user_id)
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = p_user_id
        AND (u.email ILIKE 'e2e-%@%' OR u.email ILIKE '%@vitanatest.exafy.io')
    )
  );
$$;

COMMENT ON FUNCTION _notif_is_test_actor(UUID) IS
  'VTID-03506: true when the actor is a registered or pattern-matched test account.';

-- ── 3. Sink guard on user_notifications ──────────────────────────────────────
CREATE OR REPLACE FUNCTION _notif_suppress_test_actor()
RETURNS TRIGGER AS $$
DECLARE v_actor UUID;
BEGIN
  -- Producers disagree on the key. All four are in live use: actor_id
  -- (post/like/comment/follow), sender_id (chat, tenant + global messages),
  -- reactor_id (message reactions), follower_id (follows).
  v_actor := NULLIF(COALESCE(
    NEW.data->>'actor_id',
    NEW.data->>'sender_id',
    NEW.data->>'reactor_id',
    NEW.data->>'follower_id'
  ), '')::UUID;

  IF v_actor IS NOT NULL AND _notif_is_test_actor(v_actor) THEN
    RAISE LOG 'notif suppressed (test actor %): type=% recipient=%',
      v_actor, NEW.type, NEW.user_id;
    RETURN NULL;  -- drop the row; the insert still succeeds for the producer
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A malformed actor key, a cast failure, anything: deliver the notification.
  RAISE LOG '_notif_suppress_test_actor failed open: %', SQLERRM;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_suppress_test_actor_notifications ON user_notifications;
CREATE TRIGGER trg_suppress_test_actor_notifications
  BEFORE INSERT ON user_notifications
  FOR EACH ROW EXECUTE FUNCTION _notif_suppress_test_actor();

-- ── 4. Source guard on the two community fan-out triggers ────────────────────
-- Bodies are unchanged from 20260630120000 apart from the guard on the first
-- line, so the two files stay diffable.
CREATE OR REPLACE FUNCTION notify_community_on_public_post()
RETURNS TRIGGER AS $$
DECLARE v_tenant UUID; v_name TEXT; v_url TEXT;
BEGIN
  IF _notif_is_test_actor(NEW.user_id) THEN RETURN NEW; END IF;  -- VTID-03506

  SELECT tenant_id INTO v_tenant FROM user_tenants
    WHERE user_id = NEW.user_id ORDER BY is_primary DESC NULLS LAST LIMIT 1;
  IF v_tenant IS NULL THEN RETURN NEW; END IF;
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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
  SELECT NULLIF(TRIM(display_name), '') INTO v_name FROM profiles WHERE user_id = NEW.user_id;
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
