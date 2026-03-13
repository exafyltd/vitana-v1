-- 1. Create chat_message_replies sidecar table
CREATE TABLE public.chat_message_replies (
  message_id uuid PRIMARY KEY REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  parent_message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_chat_message_replies_parent ON public.chat_message_replies(parent_message_id);

ALTER TABLE public.chat_message_replies ENABLE ROW LEVEL SECURITY;

-- SELECT: user must be sender or receiver of the message
CREATE POLICY "Users can view reply links for their messages"
  ON public.chat_message_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = chat_message_replies.message_id
      AND (cm.sender_id = auth.uid() OR cm.receiver_id = auth.uid())
    )
  );

-- INSERT: user must be sender of the message
CREATE POLICY "Users can create reply links for messages they sent"
  ON public.chat_message_replies FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 2. Update get_message_reactions to also allow chat_messages access
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
      AND (cm.sender_id = auth.uid() OR cm.receiver_id = auth.uid())
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

-- 3. Update message_reactions SELECT policy to also cover chat_messages
DROP POLICY IF EXISTS "Users can view reactions for accessible messages" ON public.message_reactions;
CREATE POLICY "Users can view reactions for accessible messages"
  ON public.message_reactions FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM global_messages gm
      WHERE gm.id = message_reactions.message_id
      AND is_participant_of_global_thread(gm.thread_id)
    ))
    OR
    (EXISTS (
      SELECT 1 FROM messages tm
      JOIN thread_participants tp ON tp.thread_id = tm.thread_id
      WHERE tm.id = message_reactions.message_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
    ))
    OR
    (EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.id = message_reactions.message_id
      AND (cm.sender_id = auth.uid() OR cm.receiver_id = auth.uid())
    ))
  );