-- Add granular notification preference columns to notification_settings table
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS email_events BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_appointments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_ai_tips BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_weekly_reports BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_group_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_goal_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_friend_activity BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_breaking_news BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS inapp_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_system BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS inapp_achievements BOOLEAN DEFAULT true;