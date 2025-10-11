-- Add auto-greeting preference to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS auto_greeting_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_preferences.auto_greeting_enabled IS 'Enable automatic audio greeting when user opens the Health screen';