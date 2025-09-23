-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'personal',
  status TEXT NOT NULL DEFAULT 'confirmed',
  priority TEXT NOT NULL DEFAULT 'medium',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_pattern JSONB,
  attendees_count INTEGER DEFAULT 0,
  has_rewards BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Source tracking for invites
  source_message_id UUID,
  source_type TEXT DEFAULT 'manual',
  
  CONSTRAINT valid_event_type CHECK (event_type IN ('personal', 'community', 'professional', 'health', 'workout', 'nutrition')),
  CONSTRAINT valid_status CHECK (status IN ('confirmed', 'pending', 'conflict', 'cancelled')), 
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT valid_source_type CHECK (source_type IN ('manual', 'invite', 'imported'))
);

-- Create calendar invite responses table
CREATE TABLE public.calendar_invite_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_id UUID,
  response TEXT NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_response CHECK (response IN ('accepted', 'declined', 'maybe', 'pending')),
  CONSTRAINT unique_user_message_response UNIQUE (message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_invite_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can manage their own calendar events"
ON public.calendar_events
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for calendar_invite_responses  
CREATE POLICY "Users can manage their own invite responses"
ON public.calendar_invite_responses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_calendar_events_user_start_time ON public.calendar_events (user_id, start_time);
CREATE INDEX idx_calendar_events_source_message ON public.calendar_events (source_message_id) WHERE source_message_id IS NOT NULL;
CREATE INDEX idx_invite_responses_message ON public.calendar_invite_responses (message_id);

-- Add updated_at trigger
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();