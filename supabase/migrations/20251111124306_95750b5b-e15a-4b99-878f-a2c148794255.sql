-- Store daily curated matches
CREATE TABLE IF NOT EXISTS public.daily_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  matched_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  match_score DECIMAL(5,2) NOT NULL,
  match_reasons JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
  viewed_at TIMESTAMP WITH TIME ZONE,
  action TEXT CHECK (action IN ('pass', 'connect', 'super_connect'))
);

-- Store user wellness interests/preferences
CREATE TABLE IF NOT EXISTS public.user_wellness_interests (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  interests TEXT[] NOT NULL DEFAULT '{}',
  preferred_activity_time TEXT CHECK (preferred_activity_time IN ('morning', 'afternoon', 'evening', 'flexible')),
  looking_for TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track connection requests
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  message TEXT,
  request_type TEXT CHECK (request_type IN ('normal', 'super')) DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(from_user_id, to_user_id)
);

-- Enable RLS
ALTER TABLE public.daily_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wellness_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_matches
CREATE POLICY "Users can view their own daily matches"
  ON public.daily_matches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own match actions"
  ON public.daily_matches FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_wellness_interests
CREATE POLICY "Users can view their own interests"
  ON public.user_wellness_interests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interests"
  ON public.user_wellness_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interests"
  ON public.user_wellness_interests FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for connection_requests
CREATE POLICY "Users can view connection requests they sent or received"
  ON public.connection_requests FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create connection requests"
  ON public.connection_requests FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Recipients can update connection requests"
  ON public.connection_requests FOR UPDATE
  USING (auth.uid() = to_user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_matches_user_id ON public.daily_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_matches_expires_at ON public.daily_matches(expires_at);
CREATE INDEX IF NOT EXISTS idx_connection_requests_from_user ON public.connection_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_to_user ON public.connection_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_status ON public.connection_requests(status);