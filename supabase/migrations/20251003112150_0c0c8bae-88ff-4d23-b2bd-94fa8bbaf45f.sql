-- Allow thread creators to add participants to their own global threads
DROP POLICY IF EXISTS "Thread creators can add participants" ON public.global_thread_participants;

CREATE POLICY "Thread creators can add participants"
ON public.global_thread_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.global_message_threads t
    WHERE t.id = thread_id AND t.created_by = auth.uid()
  )
);