-- Create podcast show subscriptions table
CREATE TABLE podcast_show_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_name TEXT NOT NULL,
  host_name TEXT NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notification_enabled BOOLEAN DEFAULT true,
  UNIQUE(user_id, show_name, host_name)
);

-- Enable RLS
ALTER TABLE podcast_show_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON podcast_show_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions"
  ON podcast_show_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
  ON podcast_show_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_podcast_subscriptions_user_id ON podcast_show_subscriptions(user_id);
CREATE INDEX idx_podcast_subscriptions_show ON podcast_show_subscriptions(show_name, host_name);

-- Create view for popular shows (aggregate real data)
CREATE OR REPLACE VIEW popular_podcast_shows AS
SELECT 
  pm.series_name as show_name,
  pm.host_name,
  COUNT(DISTINCT pm.media_id) as episode_count,
  MAX(mu.created_at) as latest_episode_date,
  mu.category,
  COUNT(DISTINCT pss.user_id) as subscriber_count
FROM podcast_metadata pm
JOIN media_uploads mu ON pm.media_id = mu.id
LEFT JOIN podcast_show_subscriptions pss 
  ON pm.series_name = pss.show_name AND pm.host_name = pss.host_name
WHERE mu.status = 'approved' 
  AND mu.media_type = 'podcast'
  AND pm.series_name IS NOT NULL
GROUP BY pm.series_name, pm.host_name, mu.category
ORDER BY subscriber_count DESC, episode_count DESC
LIMIT 10;