-- Enable real-time updates for calendar tables
-- This ensures calendar events and invite responses update immediately in the UI

-- Set REPLICA IDENTITY FULL to capture complete row data during updates
ALTER TABLE calendar_events REPLICA IDENTITY FULL;
ALTER TABLE calendar_invite_responses REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication for real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_invite_responses;