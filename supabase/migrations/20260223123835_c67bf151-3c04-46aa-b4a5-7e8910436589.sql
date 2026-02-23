
-- Create profile_milestones table
CREATE TABLE public.profile_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  milestone_date DATE,
  icon TEXT DEFAULT '⭐',
  is_public BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profile_gallery table
CREATE TABLE public.profile_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.profile_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_gallery ENABLE ROW LEVEL SECURITY;

-- Milestones RLS policies
CREATE POLICY "Users can view public milestones"
  ON public.profile_milestones FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own milestones"
  ON public.profile_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own milestones"
  ON public.profile_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own milestones"
  ON public.profile_milestones FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own milestones"
  ON public.profile_milestones FOR DELETE
  USING (auth.uid() = user_id);

-- Gallery RLS policies
CREATE POLICY "Users can view public gallery photos"
  ON public.profile_gallery FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own gallery photos"
  ON public.profile_gallery FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own gallery photos"
  ON public.profile_gallery FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gallery photos"
  ON public.profile_gallery FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own gallery photos"
  ON public.profile_gallery FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_profile_milestones_user_id ON public.profile_milestones(user_id);
CREATE INDEX idx_profile_milestones_public ON public.profile_milestones(user_id, is_public);
CREATE INDEX idx_profile_gallery_user_id ON public.profile_gallery(user_id);
CREATE INDEX idx_profile_gallery_public ON public.profile_gallery(user_id, is_public);

-- Timestamp trigger for milestones
CREATE TRIGGER update_profile_milestones_updated_at
  BEFORE UPDATE ON public.profile_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
