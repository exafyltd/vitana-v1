-- Enable real-time updates for user_activity_log
ALTER TABLE public.user_activity_log REPLICA IDENTITY FULL;

-- Add user_activity_log to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity_log;