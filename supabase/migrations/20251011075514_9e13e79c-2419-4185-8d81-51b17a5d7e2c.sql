-- Add greeting preferences to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS greeting_frequency TEXT DEFAULT 'session' CHECK (greeting_frequency IN ('session', 'daily', 'hourly', 'off')),
ADD COLUMN IF NOT EXISTS greeting_message_types JSONB DEFAULT '["welcome", "reminder", "motivation"]'::jsonb;