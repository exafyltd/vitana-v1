-- Create life_compass table for storing user's primary goals
CREATE TABLE IF NOT EXISTS public.life_compass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_goal TEXT NOT NULL,
  ai_summary TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  alignment_score INTEGER DEFAULT 0 CHECK (alignment_score >= 0 AND alignment_score <= 100),
  confidence_score INTEGER DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create life_compass_subgoals table
CREATE TABLE IF NOT EXISTS public.life_compass_subgoals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compass_id UUID NOT NULL REFERENCES public.life_compass(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_memory_metadata table for AI sync tracking
CREATE TABLE IF NOT EXISTS public.user_memory_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_ai_sync_at TIMESTAMP WITH TIME ZONE,
  total_memories_count INTEGER DEFAULT 0,
  category_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.life_compass ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_compass_subgoals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies for life_compass
CREATE POLICY "Users can manage their own life compass"
  ON public.life_compass
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for life_compass_subgoals
CREATE POLICY "Users can manage their own subgoals"
  ON public.life_compass_subgoals
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.life_compass
    WHERE life_compass.id = life_compass_subgoals.compass_id
    AND life_compass.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.life_compass
    WHERE life_compass.id = life_compass_subgoals.compass_id
    AND life_compass.user_id = auth.uid()
  ));

-- RLS Policies for user_memory_metadata
CREATE POLICY "Users can manage their own memory metadata"
  ON public.user_memory_metadata
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_life_compass_user_id ON public.life_compass(user_id);
CREATE INDEX idx_life_compass_is_active ON public.life_compass(is_active);
CREATE INDEX idx_life_compass_subgoals_compass_id ON public.life_compass_subgoals(compass_id);
CREATE INDEX idx_user_memory_metadata_user_id ON public.user_memory_metadata(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_life_compass_updated_at
  BEFORE UPDATE ON public.life_compass
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_life_compass_subgoals_updated_at
  BEFORE UPDATE ON public.life_compass_subgoals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_memory_metadata_updated_at
  BEFORE UPDATE ON public.user_memory_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();