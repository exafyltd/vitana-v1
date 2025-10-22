-- Create community_live_streams table
CREATE TABLE community_live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  stream_type TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  access_level TEXT DEFAULT 'public',
  cover_image_url TEXT,
  co_hosts TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  enable_chat BOOLEAN DEFAULT true,
  enable_polls BOOLEAN DEFAULT false,
  enable_replay BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_live_streams_scheduled ON community_live_streams(scheduled_for) WHERE status = 'pending' AND scheduled_for IS NOT NULL;
CREATE INDEX idx_live_streams_created_by ON community_live_streams(created_by);
CREATE INDEX idx_live_streams_status ON community_live_streams(status);
CREATE INDEX idx_live_streams_live ON community_live_streams(status, started_at) WHERE status = 'live';

-- RLS Policies
ALTER TABLE community_live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public live streams" ON community_live_streams
  FOR SELECT USING (
    status IN ('pending', 'live') OR 
    (status = 'ended' AND enable_replay = true)
  );

CREATE POLICY "Users can create their own streams" ON community_live_streams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own streams" ON community_live_streams
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own streams" ON community_live_streams
  FOR DELETE USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_community_live_streams_updated_at
  BEFORE UPDATE ON community_live_streams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();