-- Fix RLS policies for global message threads to allow all authenticated users to create group chats

-- Drop and recreate the global_message_threads INSERT policy
DROP POLICY IF EXISTS "Community users can create threads" ON public.global_message_threads;

CREATE POLICY "Authenticated users can create threads" 
ON public.global_message_threads
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Drop and recreate the global_thread_participants INSERT policy
DROP POLICY IF EXISTS "Users can join threads as themselves" ON public.global_thread_participants;

CREATE POLICY "Users can join threads as themselves" 
ON public.global_thread_participants
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Drop and recreate the global_messages INSERT policy
DROP POLICY IF EXISTS "Community users can create messages" ON public.global_messages;

CREATE POLICY "Users can create messages in their threads" 
ON public.global_messages
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id 
  AND is_participant_of_global_thread(thread_id)
);