-- VTID-03089 follow-up: stable chat_groups attachments + reactions RLS
-- ───────────────────────────────────────────────────────────────────────
-- This migration supersedes the two earlier attempts which had issues that
-- only surfaced once applied in prod:
--
--   1) 20260522000000_vtid_03089_chat_group_reactions_rls.sql created a new
--      get_message_reactions_text(uuid) overload while a text-param sibling
--      already existed in prod. PostgREST refused to pick between them
--      (PGRST203 "could not choose the best candidate function").
--
--   2) 20260522000000_chat_attachments_rls_dm_and_groups.sql added a
--      multi-table EXISTS chain directly inside the storage.objects USING
--      clause. Supabase Storage's planner couldn't introspect cross-schema
--      EXISTS joins and rejected every signed-URL request with
--      "The database schema is invalid or incompatible".
--
-- Resolution:
--
--   * Encapsulate all attachment access logic in a SECURITY DEFINER helper
--     function in public; the storage policy then calls just the function,
--     so Storage sees a single boolean expression it can plan.
--
--   * Recreate get_message_reactions_text with exactly one signature
--     (text param, internal cast to uuid) so PostgREST has no ambiguity.
--     The access predicate includes the chat_group_members branch so
--     reactions on chat_group messages are visible to all members.
--
-- Idempotent: safe to re-run.

-- ── 1. Helper: can_access_chat_attachment(object_name) ─────────────────────
CREATE OR REPLACE FUNCTION public.can_access_chat_attachment(object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  folders text[];
  v_uid   uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  folders := storage.foldername(object_name);
  IF folders IS NULL OR array_length(folders, 1) < 2 THEN
    RETURN false;
  END IF;

  -- Uploader (path is {sender_id}/{...}/{file})
  IF v_uid::text = folders[1] THEN
    RETURN true;
  END IF;

  -- DM recipient (path is {sender_id}/{recipient_id}/{file})
  IF v_uid::text = folders[2] AND EXISTS (
    SELECT 1 FROM chat_messages
    WHERE receiver_id = v_uid
      AND sender_id::text = folders[1]
  ) THEN
    RETURN true;
  END IF;

  -- chat_groups member (path is {sender_id}/{group_id}/{file})
  IF EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE user_id = v_uid
      AND group_id::text = folders[2]
  ) THEN
    RETURN true;
  END IF;

  -- Legacy per-thread participant
  IF EXISTS (
    SELECT 1 FROM thread_participants
    WHERE user_id = v_uid
      AND thread_id::text = folders[2]
      AND is_active = true
  ) THEN
    RETURN true;
  END IF;

  -- Legacy global thread participant
  IF EXISTS (
    SELECT 1 FROM global_thread_participants
    WHERE user_id = v_uid
      AND thread_id::text = folders[2]
      AND is_active = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_chat_attachment(text)
  TO authenticated, anon, service_role;

-- ── 2. storage.objects SELECT policy delegates to the helper ───────────────
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

CREATE POLICY "Users can view chat attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-attachments'
  AND public.can_access_chat_attachment(name)
);

-- ── 3. Reactions RPC: single text-param overload with chat_group support ──
DROP FUNCTION IF EXISTS public.get_message_reactions_text(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_message_reactions_text(text) CASCADE;

CREATE OR REPLACE FUNCTION public.get_message_reactions_text(message_id_param text)
RETURNS TABLE(
  message_id   uuid,
  user_id      uuid,
  emoji        text,
  created_at   timestamp with time zone,
  display_name text,
  avatar_url   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_message_id uuid := message_id_param::uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.global_messages gm
      JOIN public.global_thread_participants gtp ON gtp.thread_id = gm.thread_id
      WHERE gm.id = v_message_id
        AND gtp.user_id = auth.uid()
        AND gtp.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.messages tm
      JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = v_message_id
        AND tp.user_id = auth.uid()
        AND tp.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = v_message_id
        AND (
          cm.sender_id = auth.uid()
          OR cm.receiver_id = auth.uid()
          OR (
            cm.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.chat_group_members cgm
              WHERE cgm.group_id = cm.group_id
                AND cgm.user_id = auth.uid()
            )
          )
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Cannot view reactions for this message';
  END IF;

  RETURN QUERY
  SELECT
    mr.message_id,
    mr.user_id,
    mr.emoji,
    mr.created_at,
    COALESCE(gcp.display_name, p.display_name, p.full_name, 'Unknown') AS display_name,
    COALESCE(gcp.avatar_url, p.avatar_url) AS avatar_url
  FROM public.message_reactions mr
  LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = mr.user_id
  LEFT JOIN public.profiles p ON p.user_id = mr.user_id
  WHERE mr.message_id = v_message_id
  ORDER BY mr.created_at;
END;
$function$;

-- ── 4. Also align the typed get_message_reactions(uuid) variant ────────────
CREATE OR REPLACE FUNCTION public.get_message_reactions(message_id_param uuid)
RETURNS TABLE(
  message_id   uuid,
  user_id      uuid,
  emoji        text,
  created_at   timestamp with time zone,
  display_name text,
  avatar_url   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.global_messages gm
      JOIN public.global_thread_participants gtp ON gtp.thread_id = gm.thread_id
      WHERE gm.id = message_id_param
        AND gtp.user_id = auth.uid()
        AND gtp.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.messages tm
      JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_id_param
        AND tp.user_id = auth.uid()
        AND tp.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = message_id_param
        AND (
          cm.sender_id = auth.uid()
          OR cm.receiver_id = auth.uid()
          OR (
            cm.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.chat_group_members cgm
              WHERE cgm.group_id = cm.group_id
                AND cgm.user_id = auth.uid()
            )
          )
        )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied: Cannot view reactions for this message';
  END IF;

  RETURN QUERY
  SELECT
    mr.message_id,
    mr.user_id,
    mr.emoji,
    mr.created_at,
    COALESCE(gcp.display_name, p.display_name, p.full_name, 'Unknown') AS display_name,
    COALESCE(gcp.avatar_url, p.avatar_url) AS avatar_url
  FROM public.message_reactions mr
  LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = mr.user_id
  LEFT JOIN public.profiles p ON p.user_id = mr.user_id
  WHERE mr.message_id = message_id_param
  ORDER BY mr.created_at;
END;
$function$;

NOTIFY pgrst, 'reload schema';
