-- Create user_preferences table for personal settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Autopilot settings
  autopilot_enabled BOOLEAN DEFAULT true,
  autopilot_max_actions_per_day INTEGER DEFAULT 5,
  autopilot_quiet_hours_start TIME DEFAULT '22:00',
  autopilot_quiet_hours_end TIME DEFAULT '08:00',
  autopilot_priority_filter TEXT DEFAULT 'all',
  autopilot_categories JSONB DEFAULT '{"health": true, "community": true, "discovery": true, "memory": true}'::jsonb,
  
  -- Voice STT settings
  stt_language TEXT DEFAULT 'en-US',
  stt_instant_enabled BOOLEAN DEFAULT true,
  stt_auto_punctuation BOOLEAN DEFAULT true,
  stt_sensitivity INTEGER DEFAULT 75,
  
  -- Voice TTS settings
  tts_voice TEXT DEFAULT 'alloy',
  tts_gender TEXT DEFAULT 'neutral',
  tts_character TEXT DEFAULT 'friendly',
  tts_speed DECIMAL DEFAULT 1.0,
  tts_pitch DECIMAL DEFAULT 1.0,
  tts_volume INTEGER DEFAULT 80,
  
  -- AI settings
  ai_model TEXT DEFAULT 'gpt-4',
  ai_temperature DECIMAL DEFAULT 0.7,
  ai_response_length TEXT DEFAULT 'medium',
  
  -- Privacy
  store_voice_recordings BOOLEAN DEFAULT false,
  auto_delete_recordings_days INTEGER DEFAULT 30,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Create vitana_index_config table for system-wide Vitana Index settings
CREATE TABLE IF NOT EXISTS public.vitana_index_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Algorithm parameters (weights for different health metrics)
  algorithm_weights JSONB DEFAULT '{
    "sleep": 0.25,
    "exercise": 0.20,
    "nutrition": 0.20,
    "mental_wellness": 0.15,
    "social_connection": 0.10,
    "hydration": 0.10
  }'::jsonb,
  
  -- Scoring tiers configuration
  scoring_tiers JSONB DEFAULT '[
    {"min": 0, "max": 99, "label": "Very Poor", "color": "#FEE2E2", "icon": "alert-circle"},
    {"min": 100, "max": 299, "label": "Poor", "color": "#FDE68A", "icon": "alert-triangle"},
    {"min": 300, "max": 499, "label": "Fair", "color": "#FFEFB3", "icon": "minus-circle"},
    {"min": 500, "max": 699, "label": "Improving", "color": "#D9F99D", "icon": "trending-up"},
    {"min": 700, "max": 849, "label": "Good", "color": "#BBF7D0", "icon": "check-circle"},
    {"min": 850, "max": 999, "label": "Excellent", "color": "#BAE6FD", "icon": "star"}
  ]'::jsonb,
  
  -- Display preferences
  display_preferences JSONB DEFAULT '{
    "show_score_in_header": true,
    "show_trend_indicator": true,
    "show_breakdown_details": true,
    "default_score_range": [0, 999],
    "enable_color_coding": true
  }'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add scope and created_by to automation_rules table
ALTER TABLE public.automation_rules 
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Enable RLS on new tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitana_index_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for vitana_index_config
CREATE POLICY "Anyone can view active vitana config"
  ON public.vitana_index_config
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage vitana config"
  ON public.vitana_index_config
  FOR ALL
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.role = 'admin'
      AND m.status = 'active'
    )
  )
  WITH CHECK (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
    OR EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid()
      AND m.role = 'admin'
      AND m.status = 'active'
    )
  );

-- Update automation_rules RLS to handle scope
DROP POLICY IF EXISTS "Users can manage their own rules" ON public.automation_rules;
CREATE POLICY "Users can manage their own rules"
  ON public.automation_rules
  FOR ALL
  USING (
    (scope = 'personal' AND auth.uid() = user_id)
    OR (scope = 'global' AND (
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
      )
    ))
  )
  WITH CHECK (
    (scope = 'personal' AND auth.uid() = user_id)
    OR (scope = 'global' AND (
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
      OR EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
        AND m.role = 'admin'
        AND m.status = 'active'
      )
    ))
  );

-- Insert default vitana index config
INSERT INTO public.vitana_index_config (is_active, version)
VALUES (true, 1)
ON CONFLICT DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vitana_index_config_updated_at
  BEFORE UPDATE ON public.vitana_index_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();