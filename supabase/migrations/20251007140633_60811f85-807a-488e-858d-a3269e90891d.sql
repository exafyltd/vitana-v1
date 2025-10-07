-- Add RLS policy to allow users to delete their own AI messages
CREATE POLICY "Users can delete messages from their conversations"
ON public.ai_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  )
);