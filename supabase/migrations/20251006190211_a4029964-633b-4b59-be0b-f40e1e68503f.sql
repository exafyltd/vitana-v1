-- Create event_attendees table for response tracking
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  response TEXT NOT NULL CHECK (response IN ('accepted', 'declined', 'maybe', 'pending')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create invite_analytics table for tracking engagement
CREATE TABLE public.invite_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  channel TEXT NOT NULL, -- 'messenger', 'email', 'instagram', 'x', etc.
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, channel)
);

-- Enable RLS
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_attendees
CREATE POLICY "Users can view attendees for their events"
ON public.event_attendees
FOR SELECT
USING (
  invited_by = auth.uid() OR 
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.calendar_events ce
    WHERE ce.id = event_attendees.event_id AND ce.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create attendee records"
ON public.event_attendees
FOR INSERT
WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Attendees can update their own response"
ON public.event_attendees
FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policies for invite_analytics
CREATE POLICY "Event creators can view analytics"
ON public.invite_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events ce
    WHERE ce.id = invite_analytics.event_id AND ce.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage analytics"
ON public.invite_analytics
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create function to update analytics on response
CREATE OR REPLACE FUNCTION public.update_invite_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.response != 'pending' AND (OLD.response = 'pending' OR OLD.response IS NULL) THEN
    -- Increment response count
    INSERT INTO public.invite_analytics (event_id, channel, response_count)
    VALUES (NEW.event_id, COALESCE(NEW.metadata->>'channel', 'messenger'), 1)
    ON CONFLICT (event_id, channel)
    DO UPDATE SET 
      response_count = invite_analytics.response_count + 1,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- Create trigger
CREATE TRIGGER update_invite_analytics_trigger
AFTER INSERT OR UPDATE ON public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION public.update_invite_analytics();

-- Create indexes for performance
CREATE INDEX idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX idx_event_attendees_response ON public.event_attendees(response);
CREATE INDEX idx_invite_analytics_event_id ON public.invite_analytics(event_id);