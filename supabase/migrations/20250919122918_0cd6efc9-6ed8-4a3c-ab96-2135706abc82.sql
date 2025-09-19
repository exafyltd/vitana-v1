-- Create security definer function to check global thread participation
CREATE OR REPLACE FUNCTION public.is_participant_of_global_thread(thread_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.global_thread_participants gtp
    WHERE gtp.thread_id = thread_id_param
    AND gtp.user_id = auth.uid()
    AND gtp.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Drop and recreate the recursive RLS policy on global_thread_participants
DROP POLICY IF EXISTS "Users can view participants in their threads" ON public.global_thread_participants;

CREATE POLICY "Users can view participants in their threads" ON public.global_thread_participants
FOR SELECT USING (
  (user_id = auth.uid()) OR 
  public.is_participant_of_global_thread(thread_id)
);

-- Update global_messages SELECT policy to use helper
DROP POLICY IF EXISTS "global_messages_read_by_participants" ON public.global_messages;

CREATE POLICY "global_messages_read_by_participants" ON public.global_messages
FOR SELECT USING (
  public.is_participant_of_global_thread(thread_id)
);

-- Update global_message_threads SELECT policy to use helper
DROP POLICY IF EXISTS "global_threads_read_by_participants" ON public.global_message_threads;

CREATE POLICY "global_threads_read_by_participants" ON public.global_message_threads
FOR SELECT USING (
  public.is_participant_of_global_thread(id)
);

-- Update global_typing_indicators SELECT policy to use helper
DROP POLICY IF EXISTS "Users can view typing indicators in their threads" ON public.global_typing_indicators;

CREATE POLICY "Users can view typing indicators in their threads" ON public.global_typing_indicators
FOR SELECT USING (
  public.is_participant_of_global_thread(thread_id)
);

-- Update message_reactions SELECT policy to use helper for global messages
DROP POLICY IF EXISTS "Users can view reactions for accessible messages" ON public.message_reactions;

CREATE POLICY "Users can view reactions for accessible messages" ON public.message_reactions
FOR SELECT USING (
  -- Global messages via helper function  
  (EXISTS (
    SELECT 1 FROM public.global_messages gm
    WHERE gm.id = message_reactions.message_id 
    AND public.is_participant_of_global_thread(gm.thread_id)
  ))
  OR
  -- Tenant messages via thread participants
  (EXISTS (
    SELECT 1 FROM public.messages tm
    JOIN public.thread_participants tp ON tp.thread_id = tm.thread_id
    WHERE tm.id = message_reactions.message_id 
    AND tp.user_id = auth.uid() 
    AND tp.is_active = true
  ))
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_gtp_thread_user ON public.global_thread_participants(thread_id, user_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_gm_thread ON public.global_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_gti_thread ON public.global_typing_indicators(thread_id);
CREATE INDEX IF NOT EXISTS idx_mr_message ON public.message_reactions(message_id);