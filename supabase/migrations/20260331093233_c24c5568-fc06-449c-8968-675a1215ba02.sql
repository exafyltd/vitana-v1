-- Ensure RLS is enabled (idempotent — safe if already on)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: users can read messages where they are sender or receiver
CREATE POLICY "Users can read own chat_messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- INSERT: users can send messages as themselves
CREATE POLICY "Users can insert own chat_messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());