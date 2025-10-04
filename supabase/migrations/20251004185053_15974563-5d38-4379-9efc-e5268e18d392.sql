-- ============================================
-- MATCHMAKING CORE INFRASTRUCTURE
-- ============================================

-- Match interaction types
CREATE TYPE match_interaction_type AS ENUM ('like', 'pass', 'block', 'report');

-- User match interactions (who liked/passed whom)
CREATE TABLE public.user_match_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'group', 'event', 'coach')),
  interaction_type match_interaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, target_id, target_type)
);

-- Confirmed two-way matches
CREATE TABLE public.user_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL,
  user_id_2 UUID NOT NULL,
  compatibility_score INTEGER,
  match_reason TEXT,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conversation_started BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  CHECK (user_id_1 < user_id_2), -- Ensure consistent ordering
  UNIQUE(user_id_1, user_id_2)
);

-- Match notifications
CREATE TABLE public.match_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  match_id UUID NOT NULL REFERENCES public.user_matches(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_match_interactions_user ON public.user_match_interactions(user_id);
CREATE INDEX idx_match_interactions_target ON public.user_match_interactions(target_id, target_type);
CREATE INDEX idx_matches_users ON public.user_matches(user_id_1, user_id_2);
CREATE INDEX idx_match_notifications_user ON public.match_notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE public.user_match_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_match_interactions
CREATE POLICY "Users can create their own interactions"
  ON public.user_match_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interactions"
  ON public.user_match_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
  ON public.user_match_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_matches
CREATE POLICY "Users can view their own matches"
  ON public.user_matches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can update their own matches"
  ON public.user_matches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- RLS Policies for match_notifications
CREATE POLICY "Users can view their own match notifications"
  ON public.match_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own match notifications"
  ON public.match_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to check for two-way match
CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reverse_interaction RECORD;
  new_match_id UUID;
  user1 UUID;
  user2 UUID;
BEGIN
  -- Only process 'like' interactions for users
  IF NEW.interaction_type != 'like' OR NEW.target_type != 'user' THEN
    RETURN NEW;
  END IF;

  -- Check if target user also liked this user
  SELECT * INTO reverse_interaction
  FROM public.user_match_interactions
  WHERE user_id = NEW.target_id
    AND target_id = NEW.user_id
    AND target_type = 'user'
    AND interaction_type = 'like';

  -- If two-way like exists, create match
  IF FOUND THEN
    -- Ensure consistent ordering
    user1 := LEAST(NEW.user_id, NEW.target_id);
    user2 := GREATEST(NEW.user_id, NEW.target_id);

    -- Create match (will skip if already exists due to UNIQUE constraint)
    INSERT INTO public.user_matches (user_id_1, user_id_2, compatibility_score, match_reason)
    VALUES (user1, user2, 85, 'Mutual interest match')
    ON CONFLICT (user_id_1, user_id_2) DO NOTHING
    RETURNING id INTO new_match_id;

    -- Create notifications for both users if match was newly created
    IF new_match_id IS NOT NULL THEN
      INSERT INTO public.match_notifications (user_id, match_id)
      VALUES (user1, new_match_id), (user2, new_match_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to check for matches on new like
CREATE TRIGGER trigger_check_match
  AFTER INSERT ON public.user_match_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();

-- Function to get unread match count
CREATE OR REPLACE FUNCTION public.get_unread_match_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.match_notifications
  WHERE user_id = p_user_id AND is_read = false;
$$;