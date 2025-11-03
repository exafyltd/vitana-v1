-- Add interests and wellness goals to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS wellness_goals text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shorts_filtering_enabled boolean DEFAULT true;

-- Add GIN index for better performance on media_videos tags
CREATE INDEX IF NOT EXISTS idx_media_videos_tags ON media_videos USING GIN (tags);