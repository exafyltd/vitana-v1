-- Fix RLS policies for better message visibility and real-time performance

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Community users can view messages in their threads" ON public.global_messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Community users can view threads they participate in" ON public.global_message_threads;
DROP POLICY IF EXISTS "Users can view threads they participate in" ON public.message_threads;

-- Create simplified, performant RLS policies for global messages
CREATE POLICY "global_messages_read_by_participants"
ON public.global_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.global_thread_participants gtp
    WHERE gtp.thread_id = global_messages.thread_id
      AND gtp.user_id = auth.uid()
      AND gtp.is_active = true
  )
);

-- Create simplified RLS policy for tenant messages  
CREATE POLICY "tenant_messages_read_by_participants"
ON public.messages
FOR SELECT
TO authenticated
USING (
  -- Allow if user is sender or recipient (direct messages)
  (auth.uid() = sender_id OR auth.uid() = recipient_id)
  OR
  -- Allow if user participates in the thread
  (thread_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = messages.thread_id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
  ))
  OR
  -- Allow exafy admins to see all messages
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- Create simplified RLS policy for global threads
CREATE POLICY "global_threads_read_by_participants" 
ON public.global_message_threads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.global_thread_participants gtp
    WHERE gtp.thread_id = global_message_threads.id
      AND gtp.user_id = auth.uid()
      AND gtp.is_active = true
  )
);

-- Create simplified RLS policy for tenant threads
CREATE POLICY "tenant_threads_read_by_participants"
ON public.message_threads  
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.thread_participants tp
    WHERE tp.thread_id = message_threads.id
      AND tp.user_id = auth.uid()
      AND tp.is_active = true
  )
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_global_thread_participants_lookup 
ON public.global_thread_participants (thread_id, user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_thread_participants_lookup  
ON public.thread_participants (thread_id, user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_global_messages_thread_created
ON public.global_messages (thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created
ON public.messages (thread_id, created_at);

-- Add cleanup function for old typing indicators (called by existing function)
CREATE OR REPLACE FUNCTION public.cleanup_old_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.global_typing_indicators 
  WHERE updated_at < now() - interval '10 seconds';
  
  DELETE FROM public.typing_indicators 
  WHERE updated_at < now() - interval '10 seconds';
END;
$$;