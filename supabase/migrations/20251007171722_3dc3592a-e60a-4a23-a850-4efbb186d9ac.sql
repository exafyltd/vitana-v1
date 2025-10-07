-- Enable real-time updates for ai_messages table
ALTER TABLE public.ai_messages REPLICA IDENTITY FULL;

-- Add ai_messages to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;