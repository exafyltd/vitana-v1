-- Phase 1: Campaign Distribution Database Schema

-- Table: campaign_recipients
-- Stores audience for each campaign with delivery tracking
CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('contact', 'segment', 'csv')),
  recipient_id UUID, -- References contacts.id or audience segment
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'linkedin', 'instagram', 'facebook', 'twitter', 'youtube', 'tiktok')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'unsubscribed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: campaign_audience_segments
-- Pre-defined audience segments for targeting
CREATE TABLE IF NOT EXISTS public.campaign_audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores filter criteria
  contact_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: message_queue
-- Queue for batched message processing with retry logic
CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.campaign_recipients(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'sms', 'whatsapp')),
  payload JSONB NOT NULL, -- Message content and metadata
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_channel ON public.campaign_recipients(channel);
CREATE INDEX IF NOT EXISTS idx_campaign_audience_segments_user_id ON public.campaign_audience_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_campaign_id ON public.message_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON public.message_queue(status);
CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled_for ON public.message_queue(scheduled_for);

-- RLS Policies

-- campaign_recipients: Users can manage recipients for their own campaigns
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipients for their campaigns"
  ON public.campaign_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipients for their campaigns"
  ON public.campaign_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipients for their campaigns"
  ON public.campaign_recipients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = campaign_recipients.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- campaign_audience_segments: Users manage their own segments
ALTER TABLE public.campaign_audience_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own audience segments"
  ON public.campaign_audience_segments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- message_queue: System-managed, users can view for their campaigns
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message queue for their campaigns"
  ON public.message_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = message_queue.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_recipients_updated_at
  BEFORE UPDATE ON public.campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_tables_updated_at();

CREATE TRIGGER update_campaign_audience_segments_updated_at
  BEFORE UPDATE ON public.campaign_audience_segments
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_tables_updated_at();

CREATE TRIGGER update_message_queue_updated_at
  BEFORE UPDATE ON public.message_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_tables_updated_at();