-- Create user preferences table for personalization
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wellness_pillars JSONB DEFAULT '{"Mental": true, "Movement": true, "Nutrition": true, "Sleep": true, "Hydration": true}'::jsonb,
  interests TEXT[] DEFAULT ARRAY[]::text[],
  event_types TEXT[] DEFAULT ARRAY['meetup', 'workshop', 'fitness', 'meditation']::text[],
  autopilot_enabled BOOLEAN DEFAULT true,
  autopilot_categories JSONB DEFAULT '{}'::jsonb,
  autopilot_priority_filter TEXT DEFAULT 'all',
  autopilot_max_actions_per_day INTEGER DEFAULT 5,
  preferred_time_slots TEXT[] DEFAULT ARRAY[]::text[],
  max_events_per_day INTEGER DEFAULT 3,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Create function to initialize preferences for new users
CREATE OR REPLACE FUNCTION public.initialize_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create preferences on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_preferences();