-- Enable REPLICA IDENTITY FULL for user_follows table
-- This ensures complete row data is sent in real-time events
ALTER TABLE public.user_follows REPLICA IDENTITY FULL;

-- Add table to supabase_realtime publication
-- This enables real-time broadcasting for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_follows;