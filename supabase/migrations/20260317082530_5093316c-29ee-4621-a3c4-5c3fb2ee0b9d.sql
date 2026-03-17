
-- Allow senders to DELETE their own chat_messages
CREATE POLICY "Senders can delete own chat_messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Allow senders to UPDATE content of their own chat_messages
CREATE POLICY "Senders can update own chat_messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Allow senders to DELETE their own global_messages
CREATE POLICY "Senders can delete own global_messages"
ON public.global_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Allow senders to UPDATE their own global_messages
CREATE POLICY "Senders can update own global_messages"
ON public.global_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());
