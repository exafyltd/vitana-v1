-- Phase 1: Create missing tables for personalized recommendations

-- 1. Create user_interests table for Memory Garden intelligence
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  source TEXT NOT NULL DEFAULT 'diary', -- diary, manual, inferred
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own interests"
  ON public.user_interests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Create event_recommendations table
CREATE TABLE IF NOT EXISTS public.event_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.global_community_events(id) ON DELETE CASCADE,
  match_score NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  match_reasons JSONB DEFAULT '[]'::jsonb,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.event_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event recommendations"
  ON public.event_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own event recommendations"
  ON public.event_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Create group_recommendations table
CREATE TABLE IF NOT EXISTS public.group_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.global_community_groups(id) ON DELETE CASCADE,
  match_score NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  match_reasons JSONB DEFAULT '[]'::jsonb,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  UNIQUE(user_id, group_id)
);

ALTER TABLE public.group_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own group recommendations"
  ON public.group_recommendations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own group recommendations"
  ON public.group_recommendations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON public.user_interests(interest);
CREATE INDEX IF NOT EXISTS idx_event_recommendations_user_id ON public.event_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_recommendations_event_id ON public.event_recommendations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_recommendations_score ON public.event_recommendations(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_group_recommendations_user_id ON public.group_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_group_recommendations_group_id ON public.group_recommendations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_recommendations_score ON public.group_recommendations(match_score DESC);

-- Create triggers for updated_at
CREATE TRIGGER update_user_interests_updated_at
  BEFORE UPDATE ON public.user_interests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();