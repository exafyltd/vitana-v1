-- Enable replica identity for realtime (required for updates/deletes)
ALTER TABLE api_test_logs REPLICA IDENTITY FULL;
ALTER TABLE api_integrations REPLICA IDENTITY FULL;
ALTER TABLE api_performance_metrics REPLICA IDENTITY FULL;
ALTER TABLE api_test_notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE api_test_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE api_integrations;
ALTER PUBLICATION supabase_realtime ADD TABLE api_performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE api_test_notifications;