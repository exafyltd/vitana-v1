-- VTID-03089: Allow chat_group members to access reactions on group messages
-- ───────────────────────────────────────────────────────────────────────
-- Before this migration the SELECT policy on message_reactions and the
-- get_message_reactions / get_message_reactions_text RPCs gated
-- chat_messages access on (sender_id = auth.uid() OR receiver_id = auth.uid()).
-- For group chats (chat_messages.group_id IS NOT NULL, receiver_id IS NULL)
-- this excluded every member except the original sender, so reactions
-- on 🎆 FIRST 100 messages never appeared and the realtime subscription
-- in useMessageReactions never delivered updates. Extend the predicate
-- to also pass when the message belongs to a chat_group the caller is
-- a member of.

-- 1. SELECT RLS policy on message_reactions
DROP POLICY IF EXISTS "Users can view reactions for accessible messages" ON public.message_reactions;
CREATE POLICY "Users can view reactions for accessible messages"
  ON public.message_reactions FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM public.global_messages gm
      WHERE gm.id = message_reactions.message_id
      AND is_participant_of_global_thread(gm.thread_id)
    ))
    OR
    (EXISTS (
      SELECT 1 FROM public.messages tm
      JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_reactions.message_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    ))
    OR
    (EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = message_reactions.message_id
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
    ))
  );

-- 2. get_message_reactions RPC
CREATE OR REPLACE FUNCTION public.get_message_reactions(message_id_param uuid)
 RETURNS TABLE(message_id uuid, user_id uuid, emoji text, created_at timestamp with time zone, display_name text, avatar_url text)
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
    OR
    EXISTS (
      SELECT 1 FROM public.messages tm
      JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_id_param
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
    OR
    EXISTS (
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
    COALESCE(gcp.display_name, p.display_name, p.full_name, 'Unknown') as display_name,
    COALESCE(gcp.avatar_url, p.avatar_url) as avatar_url
  FROM public.message_reactions mr
  LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = mr.user_id
  LEFT JOIN public.profiles p ON p.user_id = mr.user_id
  WHERE mr.message_id = message_id_param
  ORDER BY mr.created_at;
END;
$function$;

-- 3. get_message_reactions_text RPC (frontend useMessageReactions calls this one)
CREATE OR REPLACE FUNCTION public.get_message_reactions_text(message_id_param uuid)
 RETURNS TABLE(message_id uuid, user_id uuid, emoji text, created_at timestamp with time zone, display_name text, avatar_url text)
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
    OR
    EXISTS (
      SELECT 1 FROM public.messages tm
      JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_id_param
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    )
    OR
    EXISTS (
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
    COALESCE(gcp.display_name, p.display_name, p.full_name, 'Unknown') as display_name,
    COALESCE(gcp.avatar_url, p.avatar_url) as avatar_url
  FROM public.message_reactions mr
  LEFT JOIN public.global_community_profiles gcp ON gcp.user_id = mr.user_id
  LEFT JOIN public.profiles p ON p.user_id = mr.user_id
  WHERE mr.message_id = message_id_param
  ORDER BY mr.created_at;
END;
$function$;
