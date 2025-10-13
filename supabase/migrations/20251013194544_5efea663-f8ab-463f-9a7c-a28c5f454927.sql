-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run API tests every 15 minutes
-- This will call the run-api-tests edge function
SELECT cron.schedule(
  'run-api-integration-tests',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/run-api-tests',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to get failed tests in the last hour
CREATE OR REPLACE FUNCTION public.get_recent_test_failures()
RETURNS TABLE(
  integration_name text,
  error_count bigint,
  latest_error text,
  latest_timestamp timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ai.name as integration_name,
    COUNT(*) as error_count,
    MAX(atl.error_log) as latest_error,
    MAX(atl.timestamp) as latest_timestamp
  FROM api_test_logs atl
  JOIN api_integrations ai ON ai.id = atl.integration_id
  WHERE atl.status = 'failed'
    AND atl.timestamp > NOW() - INTERVAL '1 hour'
  GROUP BY ai.name
  HAVING COUNT(*) > 0;
$$;

-- Create a notification log table for test failures
CREATE TABLE IF NOT EXISTS public.api_test_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'test_failure',
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  sent_at timestamp with time zone DEFAULT NOW(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Enable RLS on notifications table
ALTER TABLE public.api_test_notifications ENABLE ROW LEVEL SECURITY;

-- Allow admins and staff to view notifications
CREATE POLICY "Admins and staff can view test notifications"
ON public.api_test_notifications
FOR SELECT
USING (
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
  OR EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
      AND m.role IN ('admin', 'staff')
      AND m.status = 'active'
  )
);

-- Allow system to insert notifications
CREATE POLICY "System can insert test notifications"
ON public.api_test_notifications
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_api_test_notifications_integration_id 
ON public.api_test_notifications(integration_id);

CREATE INDEX IF NOT EXISTS idx_api_test_notifications_sent_at 
ON public.api_test_notifications(sent_at DESC);