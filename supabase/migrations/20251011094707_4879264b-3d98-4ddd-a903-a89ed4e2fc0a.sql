-- Update default tts_speed to 1.1
ALTER TABLE public.user_preferences 
ALTER COLUMN tts_speed SET DEFAULT 1.1;

-- Update existing records to 1.1 if they are still at 1.0
UPDATE public.user_preferences 
SET tts_speed = 1.1 
WHERE tts_speed = 1.0;