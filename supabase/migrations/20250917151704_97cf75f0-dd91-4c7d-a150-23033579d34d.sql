-- Drop existing problematic RLS policies for thread_participants
DROP POLICY IF EXISTS "Thread admins can manage participants" ON public.thread_participants;
DROP POLICY IF EXISTS "Users can view participants in their threads" ON public.thread_participants;

-- Create simplified, non-recursive RLS policies for thread_participants
CREATE POLICY "Users can view thread participants" 
ON public.thread_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

CREATE POLICY "Users can join threads as themselves" 
ON public.thread_participants 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" 
ON public.thread_participants 
FOR UPDATE 
USING (user_id = auth.uid());

-- Fix messages table RLS policy to be simpler
DROP POLICY IF EXISTS "Enhanced message access policy" ON public.messages;

CREATE POLICY "Users can view their messages" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR 
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);