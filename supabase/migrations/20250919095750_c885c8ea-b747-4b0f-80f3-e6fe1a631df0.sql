-- Create push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  muted_threads text[] DEFAULT '{}'::text[]
);

-- Add RLS policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON public.push_subscriptions(user_id, is_active) WHERE is_active = true;

-- Create notification settings table
CREATE TABLE public.notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  push_enabled boolean NOT NULL DEFAULT false,
  dnd_start_time time,
  dnd_end_time time,
  dnd_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for notification settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification settings"
ON public.notification_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create thread presence table for suppression
CREATE TABLE public.thread_presence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL,
  context text NOT NULL CHECK (context IN ('global', 'tenant')),
  tenant_id uuid,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, thread_id, context)
);

-- Add RLS policies for thread presence
ALTER TABLE public.thread_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own thread presence"
ON public.thread_presence
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for thread presence
CREATE INDEX idx_thread_presence_user_thread ON public.thread_presence(user_id, thread_id, context);
CREATE INDEX idx_thread_presence_recent ON public.thread_presence(thread_id, last_seen) WHERE last_seen > now() - interval '1 minute';

-- Create notification logs table for diagnostics
CREATE TABLE public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL,
  message_id uuid,
  action text NOT NULL CHECK (action IN ('sent', 'suppressed')),
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies for notification logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs"
ON public.notification_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Only system can insert logs
CREATE POLICY "System can insert notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for notification logs
CREATE INDEX idx_notification_logs_user_recent ON public.notification_logs(user_id, created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();