-- Fix RLS policy to allow message senders to see all responses to their calendar invites
CREATE POLICY "Message senders can view all responses to their messages" 
ON public.calendar_invite_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = calendar_invite_responses.message_id 
    AND m.sender_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.global_messages gm 
    WHERE gm.id = calendar_invite_responses.message_id 
    AND gm.sender_id = auth.uid()
  )
);