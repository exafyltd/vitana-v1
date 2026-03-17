
-- Trigger function: call appilix-push edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_appilix_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire for push-eligible notifications
  IF NEW.channel IN ('push_and_inapp', 'push') THEN
    PERFORM net.http_post(
      url := 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/functions/v1/appilix-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw'
      ),
      body := jsonb_build_object(
        'user_identity', NEW.user_id::text,
        'notification_title', COALESCE(NEW.title, 'New notification'),
        'notification_body', COALESCE(NEW.body, ''),
        'open_link_url', 'https://vitana-v1.lovable.app' || COALESCE(NEW.data->>'url', '/inbox')
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on user_notifications
CREATE TRIGGER trg_appilix_push
AFTER INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_appilix_push();
