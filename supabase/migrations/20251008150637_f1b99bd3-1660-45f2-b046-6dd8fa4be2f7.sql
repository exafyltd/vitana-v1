-- Drop existing tables if they exist to clean up
DROP TABLE IF EXISTS public.event_recommendations CASCADE;
DROP TABLE IF EXISTS public.group_recommendations CASCADE;

-- Create event_recommendations table
CREATE TABLE public.event_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.global_community_events(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  match_reasons JSONB DEFAULT '[]'::jsonb,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, event_id)
);

-- Create group_recommendations table
CREATE TABLE public.group_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.global_community_groups(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  match_reasons JSONB DEFAULT '[]'::jsonb,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE public.event_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_recommendations
CREATE POLICY "Users can view their own event recommendations"
  ON public.event_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss their own event recommendations"
  ON public.event_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert event recommendations"
  ON public.event_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for group_recommendations
CREATE POLICY "Users can view their own group recommendations"
  ON public.group_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss their own group recommendations"
  ON public.group_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert group recommendations"
  ON public.group_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_event_recommendations_user_score ON public.event_recommendations(user_id, match_score DESC) WHERE NOT is_dismissed;
CREATE INDEX idx_group_recommendations_user_score ON public.group_recommendations(user_id, match_score DESC) WHERE NOT is_dismissed;
CREATE INDEX idx_event_recommendations_expires ON public.event_recommendations(expires_at) WHERE NOT is_dismissed;
CREATE INDEX idx_group_recommendations_expires ON public.group_recommendations(expires_at) WHERE NOT is_dismissed;