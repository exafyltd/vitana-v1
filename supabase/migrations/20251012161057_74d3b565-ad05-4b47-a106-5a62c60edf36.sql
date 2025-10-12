-- Phase 1: Proactive Assistant Foundation
-- Add user journey tracking and demographics

-- 1. User Journey Tracking Table
CREATE TABLE IF NOT EXISTS public.user_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_stage TEXT NOT NULL DEFAULT 'new',
  experience_level TEXT NOT NULL DEFAULT 'beginner',
  engagement_score INTEGER NOT NULL DEFAULT 0,
  days_active INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE,
  milestones JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_journey ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own journey"
  ON public.user_journey FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own journey"
  ON public.user_journey FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert journey records"
  ON public.user_journey FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Extend profiles with demographics and activity patterns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_range TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS preferred_languages JSONB DEFAULT '["en"]'::jsonb,
  ADD COLUMN IF NOT EXISTS inferred_language TEXT;

-- 3. Proactive Context Cache Table
CREATE TABLE IF NOT EXISTS public.proactive_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.proactive_context_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own context cache"
  ON public.proactive_context_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage context cache"
  ON public.proactive_context_cache FOR ALL
  USING (true);

-- 4. Proactive Engagement Tracking
CREATE TABLE IF NOT EXISTS public.proactive_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engagement_type TEXT NOT NULL,
  was_helpful BOOLEAN,
  user_response TEXT,
  context_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proactive_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own engagement"
  ON public.proactive_engagement FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create engagement records"
  ON public.proactive_engagement FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Admin Proactive Settings Table
CREATE TABLE IF NOT EXISTS public.admin_proactive_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_proactive_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view proactive settings"
  ON public.admin_proactive_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage proactive settings"
  ON public.admin_proactive_settings FOR ALL
  USING (
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid()
      AND m.role = 'admin'::tenant_role
      AND m.status = 'active'
    )
  );

-- 6. Insert default admin settings
INSERT INTO public.admin_proactive_settings (setting_key, setting_value, description)
VALUES 
  ('system_personality', '{"tone": "friendly", "verbosity": "moderate", "empathy_level": "high"}'::jsonb, 'Overall system personality settings'),
  ('engagement_rules', '{"max_daily_proactive": 5, "quiet_hours_start": "22:00", "quiet_hours_end": "08:00", "min_minutes_between": 60}'::jsonb, 'Global engagement frequency rules'),
  ('greeting_templates', '{"new_user": "Welcome! I''m here to help you get started.", "returning_user": "Great to see you again!", "experienced_user": "Ready to explore more?"}'::jsonb, 'Greeting templates by user level')
ON CONFLICT (setting_key) DO NOTHING;

-- 7. Function to initialize user journey on signup
CREATE OR REPLACE FUNCTION public.initialize_user_journey()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_journey (user_id, onboarding_stage, experience_level, engagement_score, days_active)
  VALUES (NEW.id, 'new', 'beginner', 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create journey on user signup
DROP TRIGGER IF EXISTS on_user_journey_created ON auth.users;
CREATE TRIGGER on_user_journey_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_journey();

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_journey_user_id ON public.user_journey(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_context_cache_user_id ON public.proactive_context_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_context_cache_expires_at ON public.proactive_context_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_proactive_engagement_user_id ON public.proactive_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_engagement_created_at ON public.proactive_engagement(created_at DESC);