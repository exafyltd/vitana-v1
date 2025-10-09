-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule appointment reminder function to run every hour
SELECT cron.schedule(
  'appointment-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/send-appointment-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw"}'::jsonb,
    body := jsonb_build_object('triggered_by', 'cron', 'timestamp', now())
  ) AS request_id;
  $$
);