-- impact-allow-solo-migration — pure-RLS fix, no gateway/worker code change needed
-- =============================================================================
-- Re-apply the chat_group_members RLS recursion fix.
--
-- Why this exists again:
--   20260522010000_chat_group_members_recursion_fix.sql never landed in the
--   VITANA prod project (it is absent from supabase_migrations.schema_migrations
--   even though later June migrations are present). As a result prod still runs
--   the original self-referential chat_group_members_read policy:
--
--     USING (EXISTS (SELECT 1 FROM chat_group_members m2
--                    WHERE m2.group_id = chat_group_members.group_id
--                      AND m2.user_id = auth.uid()))
--
--   Postgres re-applies that same policy when planning the inner query, raising
--   "42P17 infinite recursion detected in policy for relation
--   chat_group_members". The chat_messages SELECT policy
--   users_read_group_messages references chat_group_members inline, so the
--   recursion is dragged into chat_messages planning too.
--
-- User-visible symptom:
--   Editing (or deleting) a direct DM fails with "Update Failed / Failed to
--   update message". The edit path runs a plain client-side
--   UPDATE chat_messages ... directly (ConversationView onUpdateMessage); even
--   without RETURNING, Postgres expands the table's SELECT policies while
--   planning the UPDATE, hits users_read_group_messages -> chat_group_members,
--   and the recursion aborts the statement. Reads survive only because the app
--   reads DMs through the gateway (service_role, RLS-bypassed).
--
-- Fix (identical intent to 20260522010000, fresh version so it actually runs):
--   1) SECURITY DEFINER helper is_chat_group_member(group_id, user_id) that
--      checks membership while bypassing RLS.
--   2) Rewrite chat_group_members_read to call the helper (breaks the cycle).
--   3) Rewrite users_read_group_messages / users_send_group_messages on
--      chat_messages to call the helper instead of an inline EXISTS.
--
-- Idempotent: safe to re-run, and safe whether or not 20260522010000 ever lands.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_chat_group_member(
  p_group_id UUID,
  p_user_id  UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_group_members
    WHERE group_id = p_group_id
      AND user_id  = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_chat_group_member(UUID, UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_chat_group_member(UUID, UUID)
  TO authenticated, anon, service_role;

-- chat_group_members: members can see the membership list of their own groups.
DROP POLICY IF EXISTS chat_group_members_read ON public.chat_group_members;
CREATE POLICY chat_group_members_read
  ON public.chat_group_members FOR SELECT
  USING (
    public.is_chat_group_member(chat_group_members.group_id, auth.uid())
  );

-- chat_messages: read group messages.
DROP POLICY IF EXISTS users_read_group_messages ON public.chat_messages;
CREATE POLICY users_read_group_messages
  ON public.chat_messages FOR SELECT
  USING (
    group_id IS NOT NULL
    AND public.is_chat_group_member(chat_messages.group_id, auth.uid())
  );

-- chat_messages: send group messages.
DROP POLICY IF EXISTS users_send_group_messages ON public.chat_messages;
CREATE POLICY users_send_group_messages
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    group_id IS NOT NULL
    AND auth.uid() = sender_id
    AND public.is_chat_group_member(chat_messages.group_id, auth.uid())
  );

COMMENT ON FUNCTION public.is_chat_group_member(UUID, UUID) IS
  'SECURITY DEFINER membership check used by chat_groups / chat_group_members / chat_messages RLS to avoid self-referential recursion in chat_group_members policy.';

NOTIFY pgrst, 'reload schema';
